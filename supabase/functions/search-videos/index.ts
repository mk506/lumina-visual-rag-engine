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
    const { query, videoId, filters } = await req.json();
    
    if (!query) {
      throw new Error("Missing search query");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Searching for: "${query}" in video: ${videoId || "all"}`);

    // Fetch all segments (optionally filtered by video)
    let segmentsQuery = supabase
      .from("video_segments")
      .select(`
        *,
        videos!inner(id, title, filename, storage_path, status)
      `)
      .eq("videos.status", "ready");

    if (videoId) {
      segmentsQuery = segmentsQuery.eq("video_id", videoId);
    }

    const { data: segments, error: fetchError } = await segmentsQuery;

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw fetchError;
    }

    if (!segments || segments.length === 0) {
      return new Response(
        JSON.stringify({ results: [], message: "No indexed content found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use AI to rank and score segments based on query relevance
    const rankingPrompt = `You are a semantic search ranking system. Given a user query and a list of video segments, rank them by relevance.

User Query: "${query}"

Video Segments:
${segments.map((seg, idx) => `
[${idx}] Timestamp: ${seg.timestamp_display}
Description: ${seg.description || "N/A"}
Transcript: ${seg.transcript || "N/A"}
OCR Text: ${seg.ocr_text || "N/A"}
Objects: ${JSON.stringify(seg.detected_objects)}
`).join("\n")}

Analyze semantic relevance considering:
1. Direct keyword matches in description, transcript, and OCR text
2. Conceptual/semantic relevance to the query
3. Object detection relevance

Return a JSON array of objects with this exact structure (top 10 most relevant, sorted by score descending):
[
  {
    "index": 0,
    "relevance_score": 0.95,
    "reason": "Brief explanation of why this is relevant"
  }
]

Only include segments with relevance_score > 0.3. Only respond with the JSON array.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a semantic search ranking system. Always respond with valid JSON only." },
          { role: "user", content: rankingPrompt },
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
    const rankingContent = aiResult.choices?.[0]?.message?.content;

    let rankings = [];
    try {
      const jsonMatch = rankingContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        rankings = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Ranking parse error:", parseError);
      // Fallback: simple text matching
      rankings = segments.map((seg, idx) => {
        const text = `${seg.description || ""} ${seg.transcript || ""} ${seg.ocr_text || ""}`.toLowerCase();
        const queryLower = query.toLowerCase();
        const words = queryLower.split(/\s+/);
        const matches = words.filter(w => text.includes(w)).length;
        return {
          index: idx,
          relevance_score: matches / words.length,
          reason: "Keyword matching fallback"
        };
      }).filter(r => r.relevance_score > 0.3)
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 10);
    }

    // Apply object filters if provided
    if (filters?.objectName) {
      rankings = rankings.filter((rank: any) => {
        const seg = segments[rank.index];
        const objects = seg.detected_objects || {};
        const count = objects[filters.objectName] || 0;
        return count >= (filters.minCount || 1);
      });
    }

    // Build results with full segment data
    const results = rankings.map((rank: any) => {
      const seg = segments[rank.index];
      return {
        id: seg.id,
        video_id: seg.video_id,
        video_title: seg.videos?.title,
        video_path: seg.videos?.storage_path,
        timestamp_seconds: parseFloat(seg.timestamp_seconds),
        timestamp_display: seg.timestamp_display,
        description: seg.description,
        transcript: seg.transcript,
        ocr_text: seg.ocr_text,
        detected_objects: seg.detected_objects,
        relevance_score: rank.relevance_score,
        relevance_reason: rank.reason,
      };
    });

    console.log(`Search returned ${results.length} results`);

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in search-videos:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
