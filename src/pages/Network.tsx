import { useQuery } from '@tanstack/react-query'
import { networkApi } from '../services/api'
import { Card } from '../components/ui'
import { LayoutDashboard } from 'lucide-react'

interface OpManagerWidget {
  id: string
  url: string
  height: number
}

export default function Network() {
  const { data: widgetsData } = useQuery({
    queryKey: ['network-widgets'],
    queryFn: () => networkApi.widgets(),
    staleTime: Infinity,
  })

  const widgets: OpManagerWidget[] = widgetsData?.data?.data || []

  return (
    <div className="space-y-5">
      {widgets.length > 0 ? (
        <Card title="OpManager Live Dashboards" action={
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <LayoutDashboard size={13} /> Live from OpManager
          </span>
        }>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {widgets.map((w) => (
              <div key={w.id} className="rounded-lg overflow-hidden border border-gray-200 bg-white">
                <iframe
                  src={w.url}
                  width="100%"
                  height={w.height}
                  title={`OpManager Widget ${w.id}`}
                  className="w-full block"
                  style={{ border: 'none', overflow: 'hidden' }}
                />
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card title="OpManager Live Dashboards">
          <div className="py-12 text-center text-gray-400 text-sm">
            No widgets configured. Set OPMANAGER_WIDGETS in server settings to embed live dashboards.
          </div>
        </Card>
      )}
    </div>
  )
}
