interface Props {
  message: string;
  appName?: string;
}

export function MaintenanceScreen({ message, appName = "AJKMart" }: Props) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center z-[9999] p-6">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
        <div className="text-6xl mb-4">🔧</div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{appName} Maintenance</h1>
        <div className="w-16 h-1 bg-orange-400 rounded-full mx-auto mb-4" />
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          {message || "We're performing scheduled maintenance. Please check back shortly."}
        </p>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-xs text-orange-700 font-medium">
          ⏱ Hum jald hi wapas aayenge. Shukria aapke sabr ka!
        </div>
        <p className="text-xs text-gray-400 mt-4">Vendor Portal · {appName}</p>
      </div>
    </div>
  );
}
