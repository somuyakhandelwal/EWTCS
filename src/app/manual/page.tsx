"use client";

import { useState } from "react";
import { Search, Printer, BookOpen, Layers, Activity, Users, Settings } from "lucide-react";
import Image from "next/image";

export default function UserManual() {
    const [search, setSearch] = useState("");

    const features = [
        { title: "Authentication", icon: Users, desc: "Log in with your credentials to access role-based dashboards. Access is tightly controlled using granular policies based on user roles such as Admin, Supervisor, or general staff.", example: "Login Screen -> Enter Credentials -> Redirect to Dashboard", image: "/manual/auth_dashboard.png" },
        { title: "Bed Dashboard", icon: Activity, desc: "Real-time overview of bed occupancy, patient status, and unit metrics across all wards. Helps in rapid decision-making for patient triage.", example: "Dashboard -> View Stats -> Filter by Ward", image: "/manual/bed_dashboard.png" },
        { title: "AI Summary", icon: BookOpen, desc: "Automated AI-generated summaries of patient handovers, shift notes, and clinical records to save time during shift changes.", example: "Select Patient -> Click 'Generate AI Summary'", image: "/manual/ai_summary.png" },
        { title: "Shift Management", icon: Layers, desc: "Manage nursing shifts, assignments, and handovers effectively. Tracks personnel capacity against patient demand.", example: "Management -> Shifts -> Assign Nurse to Unit", image: "/manual/shift_management.png" },
        { title: "Admin & Settings", icon: Settings, desc: "Configure wards, manage users, set up data retention policies, and view overarching system analytics.", example: "Admin Panel -> User Management -> Add New User", image: "/manual/admin_settings.png" },
    ];

    const filteredFeatures = features.filter(f => f.title.toLowerCase().includes(search.toLowerCase()) || f.desc.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 print:p-0 print:bg-white">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 print:hidden">
                <div>
                    <h1 className="text-4xl font-bold text-blue-900">EWTCS User Manual</h1>
                    <p className="text-gray-600 mt-2">Comprehensive guide to using the system</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-6 md:mt-0 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search manual (e.g., Bed)..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => window.print()}
                        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg shadow hover:bg-blue-700 transition"
                    >
                        <Printer className="h-5 w-5" /> Print PDF
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
                <div className="lg:col-span-1 print:hidden">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-8">
                        <h2 className="text-xl font-bold mb-4 border-b pb-2">Table of Contents</h2>
                        <ul className="space-y-3">
                            {features.map((f, i) => (
                                <li key={i}>
                                    <a href={`#feature-${i}`} className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 transition-colors">
                                        <f.icon className="h-4 w-4" /> {f.title}
                                    </a>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8">
                            <h2 className="text-xl font-bold mb-4 border-b pb-2">Index</h2>
                            <div className="flex flex-wrap gap-2 text-sm">
                                {features.flatMap(f => f.title.split(' ')).map((word, i) => (
                                    <button
                                        key={i}
                                        className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                        onClick={() => setSearch(word)}
                                    >
                                        {word}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-8">
                    <div className="hidden print:block text-center mb-10 border-b-2 border-gray-200 pb-6">
                        <h1 className="text-4xl font-extrabold text-gray-900">EWTCS User Manual</h1>
                        <p className="text-xl text-gray-600 mt-2">Complete System Documentation</p>
                    </div>

                    {filteredFeatures.length === 0 ? (
                        <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-100 print:hidden">
                            <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-lg text-gray-500">No results found for &quot;{search}&quot;</p>
                            <button
                                onClick={() => setSearch("")}
                                className="mt-4 text-blue-600 hover:underline"
                            >
                                Clear search
                            </button>
                        </div>
                    ) : (
                        filteredFeatures.map((f, i) => (
                            <div key={i} id={`feature-${i}`} className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0 print:mb-12 print:break-inside-avoid">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="bg-blue-100 p-3 rounded-lg text-blue-600 print:bg-transparent print:p-0 print:text-black">
                                        <f.icon className="h-8 w-8" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{f.title}</h2>
                                </div>

                                <p className="text-gray-700 mb-6 text-lg leading-relaxed">{f.desc}</p>

                                <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden shadow-sm print:border-solid print:border-gray-300">
                                    <Image
                                        src={f.image}
                                        alt={`${f.title} UI`}
                                        width={1200}
                                        height={675}
                                        className="w-full h-auto object-cover"
                                    />
                                    <div className="bg-gray-50 p-3 text-sm text-center text-gray-500 border-t border-gray-200 print:bg-white print:text-gray-700">
                                        Illustration: {f.title} interface and features.
                                    </div>
                                </div>

                                <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-lg print:border-gray-800 print:bg-gray-50">
                                    <h4 className="font-semibold text-blue-900 flex items-center gap-2 print:text-black">
                                        <BookOpen className="h-5 w-5" /> Example Use Case
                                    </h4>
                                    <p className="text-blue-800 mt-2 print:text-gray-700">{f.example}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
