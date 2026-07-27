import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { approveWhitelistRequest, getPendingWhitelistRequests, ApiError } from '@/lib/api'

const PENDING_WHITELIST_REQUESTS_KEY = ['whitelist', 'requests', 'pending']

export function WhitelistRequestsPage() {
  const queryClient = useQueryClient()

  const pending = useQuery({
    queryKey: PENDING_WHITELIST_REQUESTS_KEY,
    queryFn: getPendingWhitelistRequests,
    retry: false,
  })

  const approveMutation = useMutation({
    mutationFn: approveWhitelistRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PENDING_WHITELIST_REQUESTS_KEY })
    },
  })

  const forbidden = pending.isError && pending.error instanceof ApiError && pending.error.status === 403

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-8">
      <Card>
        <CardHeader>
          <CardTitle>Whitelist requests</CardTitle>
          <CardDescription>
            Students can request access to a site not yet on the whitelisted browser's allowlist
            (SDA-04). Approving here adds it institution-wide (SDA-03).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.isLoading && <p>Loading…</p>}

          {forbidden && (
            <p className="text-sm text-destructive">
              You don't hold permission to review whitelist requests, so there's nothing to show here.
            </p>
          )}

          {pending.isError && !forbidden && (
            <p className="text-sm text-destructive">Could not load the pending requests queue.</p>
          )}

          {pending.data && pending.data.length === 0 && (
            <p className="text-sm text-muted-foreground">No whitelist requests are waiting for approval.</p>
          )}

          {pending.data && pending.data.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">URL</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {pending.data.map((req) => (
                  <tr key={req.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 break-all">{req.url}</td>
                    <td className="py-2">
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(req.id)}
                        disabled={approveMutation.isPending}
                      >
                        Approve
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {approveMutation.isError && (
            <p className="mt-3 text-sm text-destructive">
              {approveMutation.error instanceof ApiError && approveMutation.error.status === 403
                ? "You don't hold permission to approve whitelist requests."
                : 'Failed to approve this request.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
