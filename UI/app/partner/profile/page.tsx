"use client";

import AdminDataPage from "@/components/admin/AdminDataPage";
import { getMyPartner } from "@/lib/data/partner-portal";
import ProfileForm from "./ProfileForm";

/**
 * The partner's own directory profile.
 *
 * Registration captured this once and then nothing could change it short of an
 * administrator opening the record in /admin/partners — which made NREP the
 * custodian of information it does not own, and guaranteed the directory would
 * go stale. This is the page that closes that loop.
 */
export default function PartnerProfilePage() {
  return (
    <AdminDataPage title="Profile" load={() => getMyPartner()}>
      {(partner, reload) =>
        partner ? (
          <ProfileForm partner={partner} onSaved={reload} />
        ) : (
          <div className="max-w-2xl bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <div className="text-3xl mb-3">🗂️</div>
            <h1 className="text-lg font-bold text-gray-900">No directory profile</h1>
            <p className="text-sm text-gray-500 mt-1">
              This account is not linked to an Ecosystem profile, so there is nothing
              to maintain here. Contact the platform team if you expected one.
            </p>
          </div>
        )
      }
    </AdminDataPage>
  );
}
