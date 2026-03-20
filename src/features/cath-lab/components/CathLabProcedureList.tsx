import type { CathLabProcedure } from '../types/cath-lab'

interface CathLabProcedureListProps {
  procedures: CathLabProcedure[]
}

export function CathLabProcedureList({ procedures }: CathLabProcedureListProps) {
  if (procedures.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        No procedures logged yet.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="bg-muted/40 px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-card-foreground">Recent Cath Lab Procedures</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/20 border-b border-border">
            <tr>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Type</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Patient ID</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Cardiologist</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Start</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">End</th>
              <th className="text-left px-4 py-2 text-muted-foreground font-medium">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {procedures.map((procedure, index) => (
              <tr key={procedure.id} className={index % 2 === 0 ? '' : 'bg-muted/10'}>
                <td className="px-4 py-2 font-semibold text-card-foreground">{procedure.procedureType}</td>
                <td className="px-4 py-2 text-card-foreground">{procedure.patientId}</td>
                <td className="px-4 py-2 text-card-foreground">{procedure.cardiologist}</td>
                <td className="px-4 py-2 text-muted-foreground">{new Date(procedure.startTime).toLocaleString()}</td>
                <td className="px-4 py-2 text-muted-foreground">{new Date(procedure.endTime).toLocaleString()}</td>
                <td className="px-4 py-2 text-card-foreground">{procedure.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
