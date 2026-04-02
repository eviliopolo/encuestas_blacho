import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function ChartCard({ title, children, className = '' }) {
  return (
    <Card className={cn('dashboard-pdf-block', className)}>
      <CardHeader className="py-3 px-4 border-b">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      </CardHeader>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  )
}
