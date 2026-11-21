const products = [
  { id: 1, name: 'Solar Panel 550W', quantity: 42, minimum: 20 },
  { id: 2, name: 'On-Grid Inverter 3 kW', quantity: 6, minimum: 8 },
  { id: 3, name: 'Off-Grid Inverter 5 kW', quantity: 3, minimum: 5 },
  { id: 4, name: 'Battery 150Ah', quantity: 18, minimum: 10 },
  { id: 5, name: 'Mounting Structure Set', quantity: 25, minimum: 10 },
  { id: 6, name: 'DC Cable (metres)', quantity: 120, minimum: 150 },
]

export default function Stock() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Stock and Purchases</h1>
      <div className="rounded-lg border bg-white overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b">
              <th className="p-3">Product</th>
              <th className="p-3">In stock</th>
              <th className="p-3">Minimum</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const low = p.quantity < p.minimum
              return (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.quantity}</td>
                  <td className="p-3">{p.minimum}</td>
                  <td className="p-3">
                    {low ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-sm text-red-700">Low stock</span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-sm text-green-700">OK</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
