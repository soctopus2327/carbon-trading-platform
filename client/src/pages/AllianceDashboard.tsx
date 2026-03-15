import { useEffect, useState } from "react"
import axios from "axios"

interface Company {
  _id: string
  name: string
  companyType?: string
  carbonCredits?: number
}

interface AllianceDashboardData {
  allianceId: string
  allianceName: string
  allianceCode: string
  totalTrades: number
  totalCredits: number
}

interface AllianceMembersData {
  _id: string
  name: string
  code: string
  members: Company[]
}

interface AllianceStats {
  allianceId: string
  allianceName: string
  allianceCode: string
  members: Company[]
  totalTrades: number
  totalCredits: number
}

export default function AllianceDashboard() {

  const [alliances,setAlliances] = useState<AllianceStats[]>([])

  useEffect(()=>{

    const fetchDashboard = async()=>{

      try{

        const token = localStorage.getItem("token")

        const dashRes = await axios.get(
          "http://localhost:5000/alliance/dashboard",
          { headers:{ Authorization:`Bearer ${token}` } }
        )

        const memberRes = await axios.get(
          "http://localhost:5000/alliance/members",
          { headers:{ Authorization:`Bearer ${token}` } }
        )

        const dashboardData:AllianceDashboardData[] = dashRes.data
        const membersData:AllianceMembersData[] = memberRes.data

        const merged = dashboardData.map(d => {

          const found = membersData.find(m => m._id === d.allianceId)

          return {
            allianceId: d.allianceId,
            allianceName: d.allianceName,
            allianceCode: d.allianceCode,
            totalTrades: d.totalTrades,
            totalCredits: d.totalCredits,
            members: found?.members || []
          }

        })

        setAlliances(merged)

      }catch(err){
        console.error("Dashboard load error",err)
      }

    }

    fetchDashboard()

  },[])

  const totalAlliances = alliances.length

  return(

<div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-indigo-100 p-10">

<h1 className="text-4xl font-bold text-indigo-700 mb-10">
Alliance Dashboard
</h1>

{/* SUMMARY SECTION */}

<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

<div className="bg-white shadow-lg rounded-xl p-6">

<h2 className="text-lg text-gray-600">
Total Alliances Joined
</h2>

<p className="text-4xl font-bold text-indigo-600 mt-2">
{totalAlliances}
</p>

</div>

</div>

{/* ALLIANCE CARDS */}

<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 w-full">

{alliances.map(a=>(

<div
key={a.allianceId}
className="bg-white rounded-2xl shadow-xl p-6 space-y-5 hover:shadow-2xl transition"
>

{/* HEADER */}

<div>

<h2 className="text-xl font-bold text-indigo-700">
{a.allianceName}
</h2>

<p className="text-sm text-gray-500">
Code: {a.allianceCode}
</p>

</div>

{/* MEMBERS */}

<p className="text-sm font-semibold text-gray-700">
Members: {a.members.length}
</p>

<div className="grid grid-cols-2 gap-3">

{a.members.map(m=>(

<div
key={m._id}
className="bg-indigo-50 p-3 rounded-lg shadow-sm"
>

<p className="font-semibold text-indigo-700">
{m.name}
</p>

{m.companyType && (
<p className="text-xs text-gray-600">
{m.companyType}
</p>
)}

{m.carbonCredits !== undefined && (
<p className="text-xs text-indigo-600">
Credits: {m.carbonCredits}
</p>
)}

</div>

))}

</div>

{/* STATS */}

<div className="border-t pt-3 text-sm text-gray-600 space-y-1">

<p>Total Trades: {a.totalTrades}</p>
<p>Total Credits: {a.totalCredits}</p>

</div>

</div>

))}

</div>

</div>

  )

}