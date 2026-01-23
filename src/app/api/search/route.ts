import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * API route providing fuzzy search suggestions for jobs and creators.
 *
 * This endpoint expects a query string parameter `q` and returns
 * a JSON array of results. Each result contains a label, href and type.
 * - type: either "creator" or "job" so the client can display an icon.
 * - label: human readable text to display in the combobox.
 * - href: a link to the detail page for the result.
 *
 * Only the top 5 matches per category are returned to keep payloads small.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  // Return empty list early if no query specified
  if (!query || query.trim().length === 0) {
    return NextResponse.json({ results: [] });
  }

  const q = query.trim();

  // Perform case‑insensitive search against creator profiles and published jobs.
  // We choose a simple `contains` filter for demonstration. In a real app
  // you may want to use full‑text search or trigram indexes.
  const [creators, jobs] = await Promise.all([
    prisma.creatorProfile.findMany({
      where: {
        isPublic: true,
        verificationStatus: "VERIFIED",
        OR: [
          { user: { name: { contains: q, mode: "insensitive" } } },
          { bio: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        user: { select: { name: true } },
      },
      take: 5,
    }),
    prisma.job.findMany({
      where: {
        title: { contains: q, mode: "insensitive" },
        status: "PUBLISHED",
        moderationStatus: "APPROVED",
      },
      select: {
        id: true,
        title: true,
      },
      take: 5,
    }),
  ]);

  const creatorResults = creators.map((creator) => ({
    type: "creator" as const,
    label: creator.user?.name || "Креатор",
    href: `/creators/${creator.id}`,
  }));
  const jobResults = jobs.map((job) => ({
    type: "job" as const,
    label: job.title,
    href: `/jobs/${job.id}`,
  }));

  return NextResponse.json({ results: [...creatorResults, ...jobResults] });
}
