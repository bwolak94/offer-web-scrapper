'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { FilterBar } from '@/components/filters/FilterBar'
import { CriteriaTextarea } from './CriteriaTextarea'
import { ScorePreviewButton } from './ScorePreviewButton'
import { WatchFormSchema, type WatchFormValues } from '@/lib/schemas/watch'
import type { CreateWatchInput, ListingFilters, JobFilters } from '@/types'

interface WatchFormProps {
  initialValues?: Partial<WatchFormValues>
  watchId?:       string
  onSuccess?:     () => void
}

export function WatchForm({ initialValues, watchId, onSuccess }: WatchFormProps) {
  const router      = useRouter()
  const queryClient = useQueryClient()

  const [embeddedFilters, setEmbeddedFilters] = useState<ListingFilters | JobFilters>(
    (initialValues?.filters as ListingFilters) ?? {},
  )

  const form = useForm<WatchFormValues>({
    resolver: zodResolver(WatchFormSchema),
    defaultValues: {
      type:          initialValues?.type ?? 'listing',
      criteria:      initialValues?.criteria ?? '',
      minScore:      initialValues?.minScore ?? 0,
      notifyEmail:   initialValues?.notifyEmail ?? '',
      notifyWebhook: initialValues?.notifyWebhook ?? '',
    },
  })

  const watchType     = form.watch('type')
  const criteriaValue = form.watch('criteria')

  const saveMutation = useMutation({
    mutationFn: async (values: WatchFormValues) => {
      // embeddedFilters is ListingFilters | JobFilters from useState — not from Zod schema.
      // WatchFormSchema.filters is Record<string,unknown> for flexibility; the actual
      // type safety comes from the embedded FilterBar state, not from Zod validation.
      const payload: CreateWatchInput = {
        type:          values.type,
        filters:       embeddedFilters,
        criteria:      values.criteria || undefined,
        minScore:      values.minScore,
        notifyEmail:   values.notifyEmail || undefined,
        notifyWebhook: values.notifyWebhook || undefined,
      }

      const url    = watchId ? `/api/watches/${watchId}` : '/api/watches'
      const method = watchId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to save watch')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watches'] })
      onSuccess?.()
      router.push('/watches')
    },
  })

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}
        className="space-y-6"
      >
        {/* Watch type */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Watch type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="listing">Real Estate</SelectItem>
                  <SelectItem value="job">Jobs</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Embedded FilterBar — non-URL mode, branched to preserve discriminated union */}
        <div>
          <p className="mb-2 text-sm font-medium">Filters</p>
          {watchType === 'listing' ? (
            <FilterBar
              type="listing"
              embedded
              value={embeddedFilters as ListingFilters}
              onChange={(f: ListingFilters) => setEmbeddedFilters(f)}
            />
          ) : (
            <FilterBar
              type="job"
              embedded
              value={embeddedFilters as JobFilters}
              onChange={(f: JobFilters) => setEmbeddedFilters(f)}
            />
          )}
        </div>

        <Separator />

        {/* AI scoring criteria */}
        <FormField
          control={form.control}
          name="criteria"
          render={({ field }) => (
            <FormItem>
              <FormLabel>AI Scoring Criteria (optional)</FormLabel>
              <FormControl>
                <CriteriaTextarea
                  value={field.value ?? ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/*
          ScorePreviewButton + ScorePreviewResult are both Client Components using
          useQuery. ScorePreviewResult MUST NOT be a Server Component — rendering a
          Server Component inside a Client form violates RSC rules.
        */}
        {criteriaValue && (
          <ScorePreviewButton criteria={criteriaValue} watchType={watchType} />
        )}

        <Separator />

        {/* Min score */}
        <FormField
          control={form.control}
          name="minScore"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum score to notify (0–100)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notification email */}
        <FormField
          control={form.control}
          name="notifyEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notification email (optional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="you@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notification webhook */}
        <FormField
          control={form.control}
          name="notifyWebhook"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Webhook URL (optional)</FormLabel>
              <FormControl>
                <Input type="url" placeholder="https://…" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending
              ? 'Saving…'
              : watchId
                ? 'Update Watch'
                : 'Create Watch'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/watches')}
          >
            Cancel
          </Button>
        </div>

        {saveMutation.isError && (
          <p className="text-sm text-destructive">{saveMutation.error.message}</p>
        )}
      </form>
    </Form>
  )
}
