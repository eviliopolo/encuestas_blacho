import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function ChartCard({ title, children, className = '' }) {
  return (
    <Card className={className}>
      <CardHeader className="py-3 px-4 border-b">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </CardHeader>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  )
}
