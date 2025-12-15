import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, videoId } = await req.json();
    
    if (!question || !videoId) {
      throw new Error("Missing question or videoId");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Q&A for video ${videoId}: "${question}"`);

    // Fetch video info and segments
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .single();

    if (videoError || !video) {
      throw new Error("Video not found");
    }

    const { data: segments, error: segError } = await supabase
      .from("video_segments")
      .select("*")
      .eq("video_id", videoId)
      .order("timestamp_seconds", { ascending: true });

    if (segError) {
      throw segError;
    }

    // Build context from video segments
    const videoContext = segments?.map(seg => 
      `[${seg.timestamp_display}] ${seg.description || ""} ${seg.transcript ? `Spoken: "${seg.transcript}"` : ""} ${seg.ocr_text ? `On-screen text: "${seg.ocr_text}"` : ""}`
    ).join("\n") || "No segments available";

    const qaPrompt = `You are an expert video content analyst. Answer questions about the video based on the analyzed content.

Video Title: "${video.title}"

Analyzed Video Content (with timestamps):
${videoContext}

User Question: "${question}"

Provide a detailed, accurate answer based ONLY on the video content above. If the question cannot be answered from the available content, say so clearly.

Include relevant timestamps in your answer when referencing specific moments.

Also return a JSON object with relevant timestamps like this:
{"answer": "Your detailed answer here", "relevant_timestamps": ["00:00:30", "00:01:15"]}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a helpful video content analyst. Provide accurate answers based on video content." },
          { role: "user", content: qaPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Try to parse structured response
    let answer = content;
    let relevantTimestamps: string[] = [];

    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        answer = parsed.answer || content;
        relevantTimestamps = parsed.relevant_timestamps || [];
      }
    } catch {
      // Use raw content as answer
      answer = content;
    }

    // Save Q&A to history
    const { error: insertError } = await supabase
      .from("video_qa_history")
      .insert({
        video_id: videoId,
        question,
        answer,
        relevant_timestamps: relevantTimestamps,
      });

    if (insertError) {
      console.error("Insert error:", insertError);
    }

    console.log(`Q&A complete for video ${videoId}`);

    return new Response(
      JSON.stringify({ 
        answer, 
        relevant_timestamps: relevantTimestamps 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in video-qa:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
