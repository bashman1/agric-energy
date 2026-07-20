import { getPartnerBySlug } from "@/lib/data/partners";
import { getAllTechnologies } from "@/lib/data/technologies";
import { getAllThemes } from "@/lib/data/themes";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AdminPartnerForm from "@/components/admin/AdminPartnerForm";
import { getAuthToken } from "@/lib/auth/session";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    if (slug === "new") return { title: "New Partner" };
    const token = await getAuthToken();
    const partner = await getPartnerBySlug(slug, token);
    return { title: partner ? `Edit: ${partner.name}` : "Partner Not Found" };
}

export default async function AdminPartnerEditPage({ params }: Props) {
    const { slug } = await params;
    const token = await getAuthToken();

    // Reference data for smart dropdowns
    const [technologies, themes] = await Promise.all([
        getAllTechnologies(token),
        getAllThemes(token),
    ]);

    if (slug === "new") {
        return (
            <div>
                <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/admin/partners" className="hover:text-primary-700">Partners</Link>
                    <span>/</span>
                    <span className="text-gray-800 font-medium">New Partner</span>
                </nav>
                <h1 className="text-2xl font-bold text-gray-900 mb-6">New Partner</h1>
                <AdminPartnerForm
                    partner={{}}
                    mode="new"
                    technologies={technologies}
                    themes={themes}
                />
            </div>
        );
    }

    const partner = await getPartnerBySlug(slug, token);
    if (!partner) notFound();

    return (
        <div>
            <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                <Link href="/admin/partners" className="hover:text-primary-700">Partners</Link>
                <span>/</span>
                <span className="text-gray-800 font-medium truncate max-w-xs">{partner.name}</span>
            </nav>

            {/* Header with logo if available */}
            <div className="flex items-center gap-4 mb-6">
                {partner.logo && (
                    <div className="w-12 h-12 rounded-xl border border-gray-100 bg-white p-1.5 shrink-0 flex items-center justify-center shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={partner.logo} alt="" className="max-h-full max-w-full object-contain" />
                    </div>
                )}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Partner</h1>
                    <p className="text-sm text-gray-500">{partner.type}</p>
                </div>
            </div>

            <AdminPartnerForm
                partner={partner}
                mode="edit"
                technologies={technologies}
                themes={themes}
            />
        </div>
    );
}
