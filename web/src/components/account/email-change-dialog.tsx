import { useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { toast } from "sonner"

import { profileQueryKey } from "@/auth/auth-context"
import { CodeInput } from "@/components/code-input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { confirmEmailChange, requestEmailChange } from "@/lib/auth"
import { isCompleteCode, isSignInEmail } from "@/lib/schemas"
import { texts } from "@/texts"

const labels = texts.account.emailChange

/**
 * Changer son adresse e-mail (carte Profil de Mon compte), en deux étapes : la nouvelle adresse,
 * puis le code qu'elle reçoit (il part tout seul au 6e chiffre, comme à la connexion). L'adresse
 * actuelle reçoit aussi un e-mail, qui sert d'alerte. Le profil suit par un déclencheur de la base
 * (sync_profile_email).
 */
export function EmailChangeDialog({
  open,
  onOpenChange,
  userId,
  currentEmail,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
  currentEmail: string
}) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<"email" | "code">("email")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)

  const newEmail = email.trim()
  const reset = () => {
    setStep("email")
    setEmail("")
    setEmailError(null)
    setCode("")
  }

  async function send(again: boolean) {
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      setEmailError(labels.sameEmail)
      return
    }
    setPending(true)
    const result = await requestEmailChange(newEmail)
    setPending(false)
    if (typeof result === "object") {
      if (again) toast.error(result.error)
      else setEmailError(result.error)
      return
    }
    if (again)
      toast.success(
        result === "sent" ? labels.resent : texts.common.tooManyAttempts
      )
    setStep("code")
  }

  async function confirm(value: string) {
    if (pending || !isCompleteCode(value)) return
    setPending(true)
    const error = await confirmEmailChange(newEmail, currentEmail, value)
    setPending(false)
    if (error) {
      toast.error(error)
      setCode("")
      return
    }
    await queryClient.invalidateQueries({ queryKey: profileQueryKey(userId) })
    toast.success(labels.done)
    onOpenChange(false)
    reset()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (step === "email") void send(false)
    else void confirm(code)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="grid gap-4">
          <DialogHeader>
            <DialogTitle>
              {step === "email" ? labels.title : labels.codeTitle}
            </DialogTitle>
            <DialogDescription>
              {step === "email"
                ? labels.description
                : labels.codeSent(newEmail)}
            </DialogDescription>
          </DialogHeader>
          {step === "email" ? (
            <Field data-invalid={emailError !== null}>
              <FieldLabel htmlFor="email-change-address">
                {labels.newEmail}
              </FieldLabel>
              <Input
                id="email-change-address"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder={texts.signIn.emailPlaceholder}
                value={email}
                aria-invalid={emailError !== null}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setEmailError(null)
                }}
              />
              <FieldError
                errors={[emailError ? { message: emailError } : undefined]}
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="email-change-code">{labels.code}</FieldLabel>
              <CodeInput
                id="email-change-code"
                value={code}
                disabled={pending}
                onChange={setCode}
                onComplete={(value) => void confirm(value)}
              />
              {/* Comme à la connexion : deux liens sous le code. */}
              <div className="flex justify-between gap-2">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  disabled={pending}
                  onClick={() => void send(true)}
                >
                  {labels.resend}
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  disabled={pending}
                  onClick={() => {
                    setStep("email")
                    setCode("")
                  }}
                >
                  {labels.otherEmail}
                </Button>
              </div>
            </Field>
          )}
          <DialogFooter>
            <Button
              type="submit"
              disabled={
                pending ||
                (step === "email"
                  ? !isSignInEmail(newEmail)
                  : !isCompleteCode(code))
              }
            >
              {pending && <Spinner />}
              {step === "email" ? labels.send : labels.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
