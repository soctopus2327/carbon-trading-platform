import PageLayout from "../components/layout/PageLayout";

export default function Marketplace() {

  const projects = [
    {
      registry: "VERRA",
      title: "Amazon Rainforest Conservation Phase II",
      location: "Brazil",
      type: "FORESTRY",
      year: "2023",
      change: "+2.3%",
      image:
        "https://images.unsplash.com/photo-1508780709619-79562169bc64?w=1200",
    },
    {
      registry: "GOLD STANDARD",
      title: "Gujarat Solar Power Project",
      location: "India",
      type: "RENEWABLE ENERGY",
      year: "2024",
      change: "Stable",
      image:
        "https://images.unsplash.com/photo-1509395176047-4a66953fd231?w=1200",
    },
    {
      registry: "ACR",
      title: "Direct Air Capture Prototype",
      location: "Iceland",
      type: "CARBON CAPTURE",
      year: "2024",
      change: "+5.4%",
      image:
        "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1200",
    },
  ];

  return (

    <PageLayout title="Marketplace"
    description="Trade high-quality carbon credits from verified global projects.">

      {/* Top bar */}

      <div className="flex justify-between items-center mb-6">

        <div className="flex gap-3">

          {["All", "Forestry", "Renewable Energy", "Carbon Capture", "Agriculture"].map(
            (tab, i) => (
              <button
                key={i}
                className={`px-4 py-2 rounded-lg text-sm font-medium
                ${i === 0
                    ? "bg-black text-white"
                    : "bg-white border hover:bg-gray-100"
                  }`}
              >
                {tab}
              </button>
            )
          )}

        </div>


        <div className="flex gap-3">

          <input
            placeholder="Search projects..."
            className="border rounded-lg px-4 py-2 w-64"
          />

          <button className="border px-4 py-2 rounded-lg">
            Filter
          </button>

        </div>

      </div>


      {/* Cards */}

      <div className="grid grid-cols-3 gap-6">

        {projects.map((project, index) => (

          <div
            key={index}
            className="bg-white rounded-2xl shadow hover:shadow-lg transition"
          >

            {/* Image */}

            <div className="relative">

              <img
                src={project.image}
                className="h-52 w-full object-cover rounded-t-2xl"
              />

              <div className="absolute top-3 left-3 bg-white text-xs font-semibold px-3 py-1 rounded-full">

                {project.registry}

              </div>

              <div className="absolute top-3 right-3 bg-black text-white text-xs px-3 py-1 rounded-full">

                {project.year}

              </div>

            </div>


            {/* Content */}

            <div className="p-5">

              <div className="text-green-600 text-xs font-semibold mb-1">

                {project.type}

              </div>


              <h3 className="font-semibold text-lg mb-1">

                {project.title}

              </h3>


              <div className="text-gray-500 text-sm mb-3">

                📍 {project.location}

              </div>


              <div className="text-green-600 font-medium text-sm">

                {project.change}

              </div>

            </div>

          </div>

        ))}

      </div>

    </PageLayout>

  );
}
