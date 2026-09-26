'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

interface WatchActionsProps {
  watchId: string
}

export function WatchActions({ watchId }: WatchActionsProps) {
  const queryClient      = useQueryClient()
  const router           = useRouter()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/watches/${watchId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete watch')
    },
    onSuccess: () => {
      setDeleteOpen(false)
      queryClient.invalidateQueries({ queryKey: ['watches'] })
    },
  })

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Actions" />
          }
        >
          <MoreHorizontal size={14} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/watches/${watchId}`)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete watch?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. You will stop receiving notifications for this watch.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
