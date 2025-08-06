interface PrintHeaderProps {
  title: string
  subtitle?: string
  date?: string
  additionalInfo?: string[]
}

export function PrintHeader({ title, subtitle, date, additionalInfo }: PrintHeaderProps) {
  return (
    <div className="print-header">
      <h1>
        Dairy Subscription Management System
      </h1>
      <h2>{title}</h2>
      {subtitle && (
        <p>{subtitle}</p>
      )}
      {date && (
        <p>Generated: {date}</p>
      )}
      {additionalInfo && additionalInfo.length > 0 && (
        <div>
          {additionalInfo.map((info, index) => (
            <p key={index}>{info}</p>
          ))}
        </div>
      )}
    </div>
  )
}