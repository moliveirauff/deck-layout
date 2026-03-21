type FormFieldProps = {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}

/** Wraps a form control with a label, optional hint, and inline error message. */
export function FormField({ label, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
