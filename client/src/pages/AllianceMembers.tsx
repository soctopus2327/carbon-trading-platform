import { useEffect, useState } from "react"
import axios from "axios"
import { FaPlus, FaTrash } from "react-icons/fa"
import Swal from "sweetalert2"

interface Company {
  _id: string
  name: string
  companyType: string
  status: string
  carbonCredits: number
}

interface PollOption {
  text: string
  votes: number
}

interface Poll {
  _id: string
  question: string
  options: PollOption[]
  status: "ACTIVE" | "CLOSED"
  voters: { company: string }[]
}

interface JoinRequest {
  company: Company
}

interface Alliance {
  _id: string
  name: string
  code: string
  members?: Company[]
  polls?: Poll[]
  joinRequests?: JoinRequest[]
}

export default function AllianceMembers() {

  const [alliances, setAlliances] = useState<Alliance[]>([])
  const [newAllianceName, setNewAllianceName] = useState("")
  const [joinCode, setJoinCode] = useState("")
  const [pollQuestions, setPollQuestions] = useState<{ [key: string]: string }>({})
  const [pollOptions, setPollOptions] = useState<{ [key: string]: string[] }>({})

  const token = localStorage.getItem("token")
  const companyId = localStorage.getItem("companyId")

  /* ================= FETCH DATA ================= */

  const fetchAlliances = async () => {

    const res = await axios.get(
      "http://localhost:5000/alliance/members",
      { headers: { Authorization: `Bearer ${token}` } }
    )

    const alliancesWithPolls = await Promise.all(
      res.data.map(async (a: Alliance) => {

        const pollsRes = await axios.get(
          `http://localhost:5000/alliance/polls?allianceId=${a._id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )

        return {
          ...a,
          members: a.members || [],
          polls: pollsRes.data || []
        }

      })
    )

    setAlliances(alliancesWithPolls)

    const init: any = {}
    alliancesWithPolls.forEach(a => {
      if (!pollOptions[a._id]) init[a._id] = ["", ""]
    })

    setPollOptions(prev => ({ ...init, ...prev }))
  }

  useEffect(() => {
    fetchAlliances()
  }, [])

  /* ================= CREATE ALLIANCE ================= */

  const createAlliance = async () => {

    if (!newAllianceName.trim()) return

    await axios.post(
      "http://localhost:5000/alliance/create",
      { name: newAllianceName },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    Swal.fire("Success", "Alliance created successfully", "success")

    setNewAllianceName("")
    fetchAlliances()
  }

  /* ================= JOIN ALLIANCE ================= */

  const requestJoin = async () => {

    if (!joinCode.trim()) return

    await axios.post(
      "http://localhost:5000/alliance/request-join",
      { code: joinCode },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    Swal.fire("Success", "Join request sent", "success")

    setJoinCode("")
    fetchAlliances()
  }

  /* ================= HANDLE JOIN REQUEST ================= */

  const handleJoinRequest = async (
    allianceId: string,
    companyId: string,
    action: "APPROVE" | "REJECT"
  ) => {

    try {

      await axios.post(
        "http://localhost:5000/alliance/handle-request",
        { allianceId, companyId, action },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      Swal.fire(
        "Success",
        `Request ${action.toLowerCase()}d`,
        "success"
      )

      fetchAlliances()

    } catch (err: any) {

      Swal.fire(
        "Error",
        err.response?.data?.message || "Failed",
        "error"
      )

    }

  }

  /* ================= CREATE POLL ================= */

  const createPoll = async (allianceId: string) => {

    const question = pollQuestions[allianceId]?.trim()
    const options = pollOptions[allianceId]?.filter(o => o.trim()) || []

    if (!question || options.length < 2) {

      Swal.fire(
        "Error",
        "Poll must have question and at least 2 options",
        "warning"
      )

      return
    }

    await axios.post(
      "http://localhost:5000/alliance/poll/create",
      { allianceId, question, options },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    Swal.fire("Success", "Poll created", "success")

    setPollQuestions({ ...pollQuestions, [allianceId]: "" })
    setPollOptions({ ...pollOptions, [allianceId]: ["", ""] })

    fetchAlliances()
  }

  /* ================= VOTE ================= */

  const votePoll = async (poll: Poll, optionIndex: number) => {

    try {

      const alreadyVoted = poll.voters?.some(
        v => String(v.company) === String(companyId)
      )

      if (alreadyVoted) {

        Swal.fire(
          "Already Voted",
          "You have already voted in this poll",
          "warning"
        )

        return
      }

      await axios.post(
        "http://localhost:5000/alliance/poll/vote",
        { pollId: poll._id, optionIndex },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      Swal.fire("Success", "Vote recorded", "success")

      fetchAlliances()

    } catch (err: any) {

      Swal.fire(
        "Error",
        err.response?.data?.message || "Voting failed",
        "error"
      )

    }

  }

  return (

    <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100 px-10 py-10">

      <h1 className="text-5xl font-extrabold text-center text-indigo-800 mb-12">
        Alliance Network
      </h1>

      {/* CREATE / JOIN */}

      <div className="bg-white shadow-lg rounded-xl p-6 flex flex-wrap gap-4 justify-center mb-10">

        <input
          className="border p-3 rounded-lg w-64"
          placeholder="New Alliance"
          value={newAllianceName}
          onChange={(e) => setNewAllianceName(e.target.value)}
        />

        <button
          onClick={createAlliance}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700"
        >
          Create
        </button>

        <input
          className="border p-3 rounded-lg w-64"
          placeholder="Alliance Code"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
        />

        <button
          onClick={requestJoin}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
        >
          Join
        </button>

      </div>

      {/* ALLIANCES */}

      <div className="space-y-10">

        {alliances.map(alliance => {

          const latestPolls = alliance.polls?.slice(-3).reverse()

          return (

            <div key={alliance._id} className="bg-white rounded-2xl shadow-xl p-8">

              {/* HEADER */}

              <h2 className="text-2xl font-bold text-indigo-700 mb-4">
                {alliance.name}
                <span className="ml-3 text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded">
                  Code: {alliance.code}
                </span>
              </h2>

              {/* JOIN REQUESTS */}

              {alliance.joinRequests && alliance.joinRequests.length > 0 && (

                <div className="mb-8">

                  <h3 className="font-semibold text-orange-600 mb-3">
                    Join Requests
                  </h3>

                  <div className="grid md:grid-cols-2 gap-4">

                    {alliance.joinRequests.map(req => (

                      <div
                        key={req.company._id}
                        className="bg-orange-50 p-4 rounded-lg flex justify-between items-center shadow"
                      >

                        <div>
                          <p className="font-semibold text-indigo-700">
                            {req.company.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {req.company.companyType}
                          </p>
                        </div>

                        <div className="flex gap-2">

                          <button
                            onClick={() => handleJoinRequest(
                              alliance._id,
                              req.company._id,
                              "APPROVE"
                            )}
                            className="bg-green-600 text-white px-3 py-1 rounded"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() => handleJoinRequest(
                              alliance._id,
                              req.company._id,
                              "REJECT"
                            )}
                            className="bg-red-600 text-white px-3 py-1 rounded"
                          >
                            Reject
                          </button>

                        </div>

                      </div>

                    ))}

                  </div>

                </div>

              )}



              <div className="grid lg:grid-cols-3 gap-6">

                {/* POLLS */}

                <div className="lg:col-span-2 space-y-4">

                  <h3 className="font-semibold text-indigo-600">
                    Recent Polls
                  </h3>

                  {latestPolls?.map(poll => (

                    <div key={poll._id} className="bg-indigo-50 p-5 rounded-xl shadow">

                      <p className="font-semibold text-indigo-700 mb-3">
                        {poll.question}
                      </p>

                      <div className="flex flex-wrap gap-2">

                        {poll.options.map((opt, idx) => (

                          <button
                            key={idx}
                            onClick={() => votePoll(poll, idx)}
                            className="px-4 py-2 rounded-lg text-white shadow bg-indigo-600 hover:bg-indigo-700"
                          >

                            {opt.text} ({opt.votes})

                          </button>

                        ))}

                      </div>

                    </div>

                  ))}

                </div>

                {/* CREATE POLL */}

                <div className="bg-white border rounded-xl shadow p-6 space-y-3">

                  <h3 className="font-semibold text-indigo-600">
                    Create Poll
                  </h3>

                  <input
                    className="border p-2 rounded-lg w-full"
                    placeholder="Poll question"
                    value={pollQuestions[alliance._id] || ""}
                    onChange={(e) =>
                      setPollQuestions({
                        ...pollQuestions,
                        [alliance._id]: e.target.value
                      })
                    }
                  />

                  {pollOptions[alliance._id]?.map((opt, idx) => (

                    <div key={idx} className="flex gap-2">

                      <input
                        className="border p-2 rounded-lg w-full"
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={(e) => {

                          const arr = [...pollOptions[alliance._id]]
                          arr[idx] = e.target.value

                          setPollOptions({
                            ...pollOptions,
                            [alliance._id]: arr
                          })

                        }}
                      />

                      <button
                        onClick={() => {

                          const arr = [...pollOptions[alliance._id]]
                          arr.splice(idx, 1)

                          setPollOptions({
                            ...pollOptions,
                            [alliance._id]: arr
                          })

                        }}
                        className="text-red-500"
                      >
                        <FaTrash />
                      </button>

                    </div>

                  ))}

                  <button
                    onClick={() => {

                      const arr = [...pollOptions[alliance._id]]
                      arr.push("")

                      setPollOptions({
                        ...pollOptions,
                        [alliance._id]: arr
                      })

                    }}
                    className="flex items-center gap-2 text-indigo-600 font-medium"
                  >

                    <FaPlus />
                    Add Option

                  </button>

                  <button
                    onClick={() => createPoll(alliance._id)}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg w-full mt-3"
                  >

                    Create Poll

                  </button>

                </div>

              </div>

            </div>

          )

        })}

      </div>

    </div>

  )
}