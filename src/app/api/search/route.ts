// src/app/api/search/route.ts
// GET /api/search — hybrid (RRF) or filtered browse for listings and jobs.

import { NextRequest, NextResponse } from 'next/server'
import { SearchParamsSchema } from '@/lib/schemas'
import { checkSearchLimit, getIp } from '@/lib/ratelimit'
import { getFilteredListings, countFilteredListings } from '@/db/queries/listings'
import { getFilteredJobs, countFilteredJobs } from '@/db/queries/jobs'
import { searchListings, searchJobs } from '@/db/queries/search'
import type { ListingFilters, JobFilters } from '@/types'

export const maxDuration = 30

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    // ── Rate limit ────────────────────────────────────────────────────────────
    const ip = getIp(req)
    const { success } = await checkSearchLimit(ip)
    if (!success) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    // ── Parse & validate query params ─────────────────────────────────────────
    const raw = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = SearchParamsSchema.safeParse(raw)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message })) },
        { status: 400 }
      )
    }

    const {
      q,
      type,
      category,
      priceMin,
      priceMax,
      areaMin,
      areaMax,
      rooms: roomsStr,
      location,
      source: sourceStr,
      salaryMin,
      salaryMax,
      employmentType: employmentTypeStr,
      techStack: techStackStr,
      remote,
      scoreMin,
      page,
      pageSize,
      semantic,
    } = parsed.data

    // Parse comma-separated string fields
    const roomsList  = roomsStr?.split(',').map(Number)
    const sourceList = sourceStr?.split(',').filter(Boolean)
    const empTypeList = employmentTypeStr?.split(',').filter(Boolean)
    const techStackList = techStackStr?.split(',').filter(Boolean)

    const trimmedQ = q?.trim() ?? ''
    const useHybrid = semantic === '1' && trimmedQ.length >= 3

    // ── Listings ──────────────────────────────────────────────────────────────
    if (type === 'listing') {
      const filters: ListingFilters = {
        q:        trimmedQ || undefined,
        category: category as ListingFilters['category'],
        priceMin,
        priceMax,
        areaMin,
        areaMax,
        rooms:    roomsList,
        location,
        source:   sourceList as ListingFilters['source'],
        scoreMin,
        page,
        pageSize,
      }

      let data
      let total: number

      if (useHybrid) {
        // Hybrid search — count via filter approximation (same filters, no embedding)
        ;[data, total] = await Promise.all([
          searchListings(trimmedQ, filters),
          countFilteredListings(filters),
        ])
      } else if (trimmedQ.length > 0) {
        // FTS / ilike filter browse with q
        ;[data, total] = await Promise.all([
          getFilteredListings(filters),
          countFilteredListings(filters),
        ])
      } else {
        // Browse (no q)
        ;[data, total] = await Promise.all([
          getFilteredListings(filters),
          countFilteredListings(filters),
        ])
      }

      return NextResponse.json({
        data,
        total,
        page,
        pageSize,
        pages: Math.ceil(total / pageSize),
      })
    }

    // ── Jobs ──────────────────────────────────────────────────────────────────
    const jobFilters: JobFilters = {
      q:              trimmedQ || undefined,
      location,
      source:         sourceList as JobFilters['source'],
      salaryMin,
      salaryMax,
      employmentType: empTypeList as JobFilters['employmentType'],
      techStack:      techStackList,
      remote,
      scoreMin,
      page,
      pageSize,
    }

    let jobData
    let jobTotal: number

    if (useHybrid) {
      ;[jobData, jobTotal] = await Promise.all([
        searchJobs(trimmedQ, jobFilters),
        countFilteredJobs(jobFilters),
      ])
    } else {
      ;[jobData, jobTotal] = await Promise.all([
        getFilteredJobs(jobFilters),
        countFilteredJobs(jobFilters),
      ])
    }

    return NextResponse.json({
      data:     jobData,
      total:    jobTotal,
      page,
      pageSize,
      pages:    Math.ceil(jobTotal / pageSize),
    })
  } catch (err) {
    console.error('[GET /api/search] Unexpected error', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
