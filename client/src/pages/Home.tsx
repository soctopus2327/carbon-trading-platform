import React, { useEffect, useState, useRef } from "react";
interface HomeProps {
    setPage: (page: string) => void;
}

const Home: React.FC<HomeProps> = ({ setPage }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const leaderboardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");

        if (token && user) setIsLoggedIn(true);

        fetch("http://localhost:5000/leaderboard")
            .then(res => res.json())
            .then(data => setLeaderboard(data))
            .catch(err => console.error(err));
    }, []);
  const goToLeaderboard = () => {
        setPage("home"); // Make sure we are on home page
        setTimeout(() => {
            leaderboardRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100); // slight delay to ensure page renders
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("role");

        setIsLoggedIn(false);
        setPage("home");
    };

    const startTrading = () => {
        if (isLoggedIn) setPage("dashboard");
        else setPage("register");
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50">

            {/* NAVBAR */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur border-b">
                <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
                    <h1
                        className="text-2xl font-bold text-green-700 cursor-pointer"
                        onClick={() => setPage("home")}
                    >
                        DESIS 2025
                    </h1>

                    {isLoggedIn ? (
                        <div className="flex gap-8 text-gray-700 font-medium items-center">
                            <button onClick={() => setPage("dashboard")} className="hover:text-green-600">Dashboard</button>
                            <button onClick={goToLeaderboard} className="hover:text-green-600">Leaderboard</button>
                            <button onClick={()=>setPage("dashboard")} className="hover:text-green-600">Forum</button>
                            <button onClick={logout} className="text-red-500 hover:text-red-600">Logout</button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setPage("register")}
                            className="bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700"
                        >
                            Login / Signup
                        </button>
                    )}
                </div>
            </nav>

            {/* HERO */}
            <section
                className="h-[620px] flex items-center justify-center text-white relative pt-24"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=2000&q=80')",
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                }}
            >
                <div className="absolute inset-0 bg-black/55"></div>
                <div className="relative max-w-4xl text-center px-6">
                    <h1 className="text-6xl font-bold mb-6 text-white">
                        Carbon Trading <span className="text-green-400">Platform</span>
                    </h1>
                    <p className="text-xl text-gray-200 mb-10">
                        Trade verified carbon credits, support climate projects, and help companies achieve sustainability goals.
                    </p>
                    <div className="flex justify-center gap-6">
                        <button
                            onClick={startTrading}
                            className="bg-green-600 px-8 py-3 rounded-lg text-lg hover:bg-green-700 shadow-lg"
                        >
                            Start Trading
                        </button>
                       
                    </div>
                </div>
            </section>

            {/* WHY CHOOSE OUR PLATFORM */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-8 text-center">
                    <h2 className="text-4xl font-bold mb-12">Why Choose DESIS 2025?</h2>

                    <div className="grid md:grid-cols-3 gap-10">
                        <div className="p-8 bg-gray-50 rounded-2xl shadow hover:shadow-lg transition">
                            <h3 className="text-xl font-semibold mb-4 text-green-700">Verified Carbon Credits</h3>
                            <p className="text-gray-600">
                                All carbon credits on our platform are verified and audited by reputable authorities.
                            </p>
                        </div>

                        <div className="p-8 bg-gray-50 rounded-2xl shadow hover:shadow-lg transition">
                            <h3 className="text-xl font-semibold mb-4 text-green-700">Transparent Marketplace</h3>
                            <p className="text-gray-600">
                                Trade with confidence in a fully transparent and secure marketplace.
                            </p>
                        </div>

                        <div className="p-8 bg-gray-50 rounded-2xl shadow hover:shadow-lg transition">
                            <h3 className="text-xl font-semibold mb-4 text-green-700">Support Sustainability</h3>
                            <p className="text-gray-600">
                                Every transaction helps fund global climate projects and promotes sustainable practices.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* PROJECTS */}
            <section className="bg-white py-20">
                <div className="max-w-7xl mx-auto px-8">
                    <h2 className="text-4xl font-bold text-center mb-14">Featured Climate Projects</h2>
                    <div className="grid md:grid-cols-3 gap-10">
                        <ProjectCard
                            img="https://images.unsplash.com/photo-1441974231531-c6227db76b6e"
                            title="Rainforest Protection"
                            text="Protecting tropical forests while generating verified carbon credits."
                        />
                        <ProjectCard
                            img="https://images.unsplash.com/photo-1509395176047-4a66953fd231"
                            title="Solar Energy Farms"
                            text="Large-scale solar installations replacing fossil fuel electricity."
                        />
                        <ProjectCard
                            img="https://images.unsplash.com/photo-1466611653911-95081537e5b7"
                            title="Wind Energy Initiative"
                            text="Wind farms generating renewable electricity and reducing emissions."
                        />
                    </div>
                </div>
            </section>

            {/* LEADERBOARD */}
            <section ref={leaderboardRef} className="bg-gray-100 py-20">
                <div className="max-w-6xl mx-auto px-8">
                    <h2 className="text-4xl font-bold text-center mb-12">
                        Climate Leaders Leaderboard
                    </h2>
                    <div className="bg-white rounded-2xl shadow overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-green-600 text-white">
                                <tr>
                                    <th className="p-4">Rank</th>
                                    <th className="p-4">Company</th>
                                    <th className="p-4">Points</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((company, index) => (
                                    <tr key={index} className="border-b hover:bg-gray-50">
                                        <td className="p-4 font-bold text-green-700">#{index + 1}</td>
                                        <td className="p-4 font-semibold">{company.name}</td>
                                        <td className="p-4">{company.points}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* ADMIN MESSAGES */}
            <section className="py-20">
                <div className="max-w-6xl mx-auto px-8">
                    <h2 className="text-4xl font-bold text-center mb-12">Platform Announcements</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <Announcement
                            title="New Climate Projects Added"
                            text="12 rainforest protection projects were added this week."
                        />
                        <Announcement
                            title="Carbon Market Update"
                            text="Average carbon credit price increased by 4% this month."
                        />
                        <Announcement
                            title="Scheduled Maintenance"
                            text="Platform maintenance on Sunday 02:00 AM UTC."
                        />
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-gray-900 text-gray-400 mt-auto">
    <div className="max-w-7xl mx-auto px-8 py-12 grid md:grid-cols-2 gap-10">
        <div>
            <h3 className="text-white text-xl font-semibold mb-4">DESIS 2025</h3>
            <p className="text-sm">
                Transparent carbon credit marketplace supporting global climate projects.
            </p>
        </div>
    <div className="pl-6 md:pl-0 md:text-right">
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <p className="text-sm">support@desis2025.com</p>
            <p className="text-sm">+44 2045 771951</p>
        </div>
    </div>
    <div className="text-center text-sm pb-6">© 2026 DESIS Carbon Trading Platform</div>
</footer>
        </div>
    );
};

export default Home;

function ProjectCard({ img, title, text }: any) {
    return (
        <div className="rounded-2xl shadow-lg overflow-hidden bg-gray-50">
            <img src={img} className="h-56 w-full object-cover" alt={title} />
            <div className="p-6">
                <h3 className="text-xl font-semibold mb-3">{title}</h3>
                <p className="text-gray-600">{text}</p>
            </div>
        </div>
    );
}

function Announcement({ title, text }: any) {
    return (
        <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="font-semibold text-lg mb-2 text-green-700">{title}</h3>
            <p className="text-gray-600 text-sm">{text}</p>
        </div>
    );
}