import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center">
      <div className="text-center space-y-8 max-w-lg px-4">
        <div className="relative">
          <div className="text-[12rem] font-bold text-gray-100 leading-none select-none">404</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4F8EF7] to-[#3B7DE6] shadow-lg shadow-[#4F8EF7]/20">
                <span className="text-4xl">🔧</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">Lost in the Workshop?</p>
              <p className="text-gray-500 leading-relaxed">
                This page seems to have wandered off. Maybe it&apos;s in the finishing department
                or out for delivery. Let&apos;s get you back to the showroom.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <Link
                  href="/dashboard/owner"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4F8EF7] text-white text-sm font-medium hover:bg-[#3B7DE6] transition-colors shadow-sm"
                >
                  Back to Dashboard
                </Link>
                <Link
                  href="/work-orders"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  View Work Orders
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 text-xs text-gray-300">
          <span>⚡ 404</span>
          <span>•</span>
          <span>Page Not Found</span>
          <span>•</span>
          <span>Sama Al Jazeera</span>
        </div>
      </div>
    </div>
  )
}
