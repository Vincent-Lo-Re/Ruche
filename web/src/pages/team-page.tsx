import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { cn } from "cn"
import {
  KeyRound,
  Mail,
  ShieldAlert,
  ShieldCheck,
  UserMinus,
  UserPen,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { useAuth } from "@/auth/auth-context"
import { ListCard } from "@/components/list-card"
import { LoadState, RefreshFailed } from "@/components/load-state"
import { PageHeader } from "@/components/page-header"
import { RoleBadge } from "@/components/role-badge"
import { InviteDialog } from "@/components/team/invite-dialog"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { RowActionsMenu } from "@/components/row-actions-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/dates"
import { displayName } from "@/lib/people"
import { teamRead } from "@/lib/reads"
import {
  callTeam,
  countActiveAdmins,
  memberState,
  shownLastSignIn,
  teamQueryKey,
  type Member,
  type TeamRequest,
} from "@/lib/team"
import { sections } from "@/navigation"
import { ListPagination } from "@/components/list-pagination"
import { usePagination } from "@/hooks/use-pagination"
import { PAGE_SIZE } from "@/lib/pagination"
import { texts } from "@/texts"

// Actions qui demandent une confirmation.
type Confirmation = { action: "remove" | "reset_mfa"; member: Member }

// Actions sur un membre de la liste.
type MemberRequest = Exclude<TeamRequest, { action: "list" | "invite" }>

const successMessages: Record<
  Exclude<TeamRequest["action"], "list" | "invite">,
  string
> = {
  resend: texts.team.done.resent,
  set_role: texts.team.done.role,
  reset_mfa: texts.team.done.resetMfa,
  remove: texts.team.done.removed,
}

/**
 * La team : membres, invitations, rôles et double vérification. Un admin y fait tout ; un éditeur
 * la voit en lecture seule, sans invitation, renvoi ni menu d'actions (09/10/2026).
 */
export function TeamPage() {
  const { title, description } = texts.sections.team
  const { profile } = useAuth()
  const isAdmin = profile?.role === "admin"
  const queryClient = useQueryClient()
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)

  const members = useQuery(teamRead())
  // Une page de La team (25 personnes) : en pratique, une seule.
  const paged = usePagination(members.data ?? [], PAGE_SIZE, "")

  const action = useMutation({
    mutationFn: (request: MemberRequest) => callTeam(request),
    onSuccess: async (_, request) => {
      toast.success(successMessages[request.action])
      await queryClient.invalidateQueries({ queryKey: teamQueryKey })
    },
    onError: (error) => {
      toast.error(error.message)
    },
    onSettled: () => setConfirmation(null),
  })

  return (
    <>
      <PageHeader
        icon={sections.team.icon}
        title={title}
        description={description}
        actions={isAdmin ? <InviteDialog /> : undefined}
      />

      {members.data === undefined ? (
        <ListCard>
          <LoadState query={members} failed={texts.team.loadFailed} />
        </ListCard>
      ) : (
        <div className="space-y-4">
          {/* Une mise à jour a échoué : la liste déjà chargée reste affichée. */}
          <RefreshFailed query={members} text={texts.team.refreshFailed} />
          {isAdmin && countActiveAdmins(members.data) < 2 && (
            <Alert role="status">
              <ShieldAlert />
              <AlertDescription>{texts.team.singleAdmin}</AlertDescription>
            </Alert>
          )}
          <ListCard>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{texts.team.columns.member}</TableHead>
                  <TableHead>{texts.team.columns.role}</TableHead>
                  <TableHead>{texts.team.columns.status}</TableHead>
                  <TableHead>{texts.team.columns.lastSignIn}</TableHead>
                  <TableHead>{texts.team.columns.mfa}</TableHead>
                  {isAdmin && (
                    <TableHead className="w-12">
                      <span className="sr-only">{texts.common.actions}</span>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.items.map((member) => {
                  const isMe = member.id === profile?.id
                  // Heure de la liste chargée : l'affichage ne dépend pas de l'heure du rendu.
                  const state = memberState(member, members.dataUpdatedAt)
                  const expired = state === "expired"
                  const lastSignIn = shownLastSignIn(member)
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          {member.full_name ?? (
                            <span className="text-muted-foreground">
                              {texts.team.noName}
                            </span>
                          )}
                          {isMe && (
                            <Badge variant="secondary">{texts.team.you}</Badge>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {member.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={member.role} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              state === "active"
                                ? "secondary"
                                : expired
                                  ? "destructive"
                                  : "outline"
                            }
                            className={cn(
                              state === "mfaPending" && "text-warning"
                            )}
                          >
                            {texts.team.status[state]}
                          </Badge>
                          {/* Lien expiré : on met le renvoi en avant (admins). */}
                          {isAdmin && expired && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0"
                              disabled={action.isPending}
                              onClick={() =>
                                action.mutate({
                                  action: "resend",
                                  user_id: member.id,
                                })
                              }
                            >
                              {texts.team.actions.resend}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {lastSignIn
                          ? formatDateTime(lastSignIn)
                          : texts.team.never}
                      </TableCell>
                      <TableCell>
                        {member.mfa_enabled
                          ? texts.team.mfaOn
                          : texts.team.mfaOff}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          {/* Sur son propre compte : aucune action (un autre admin s'en charge). */}
                          {!isMe && (
                            <MemberActions
                              member={member}
                              disabled={action.isPending}
                              onAction={(request) => action.mutate(request)}
                              onConfirm={(kind) =>
                                setConfirmation({ action: kind, member })
                              }
                            />
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ListCard>
          <ListPagination pagination={paged} />
        </div>
      )}

      <ConfirmDialog
        open={confirmation !== null}
        {...confirmationWords(confirmation)}
        pending={action.isPending}
        onCancel={() => setConfirmation(null)}
        onConfirm={() => {
          if (confirmation)
            action.mutate({
              action: confirmation.action,
              user_id: confirmation.member.id,
            })
        }}
      />
    </>
  )
}

function MemberActions({
  member,
  disabled,
  onAction,
  onConfirm,
}: {
  member: Member
  disabled: boolean
  onAction: (request: MemberRequest) => void
  onConfirm: (action: Confirmation["action"]) => void
}) {
  const nextRole = member.role === "admin" ? "editor" : "admin"

  return (
    <RowActionsMenu
      label={texts.team.actions.open(displayName(member))}
      disabled={disabled}
      width="w-auto"
    >
      {member.status === "invited" && (
        <DropdownMenuItem
          onClick={() => onAction({ action: "resend", user_id: member.id })}
        >
          <Mail />
          {texts.team.actions.resend}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem
        onClick={() =>
          onAction({ action: "set_role", user_id: member.id, role: nextRole })
        }
      >
        {nextRole === "admin" ? <ShieldCheck /> : <UserPen />}
        {nextRole === "admin"
          ? texts.team.actions.makeAdmin
          : texts.team.actions.makeEditor}
      </DropdownMenuItem>
      {member.mfa_enabled && (
        <DropdownMenuItem onClick={() => onConfirm("reset_mfa")}>
          <KeyRound />
          {texts.team.actions.resetMfa}
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onClick={() => onConfirm("remove")}
      >
        <UserMinus />
        {texts.team.actions.remove}
      </DropdownMenuItem>
    </RowActionsMenu>
  )
}

/** Le titre, la description et le bouton d'une confirmation (retirer, réinitialiser). */
function confirmationWords(confirmation: Confirmation | null) {
  if (!confirmation) return { title: "", description: "", confirmLabel: "" }
  const copy =
    confirmation.action === "remove"
      ? texts.team.confirmRemove
      : texts.team.confirmResetMfa
  return {
    title: copy.title,
    description: copy.description(displayName(confirmation.member)),
    confirmLabel: copy.confirm,
  }
}
