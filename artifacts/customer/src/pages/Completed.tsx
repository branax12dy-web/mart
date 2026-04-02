import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Star, RotateCcw } from "lucide-react";
import { api } from "../lib/api";

type Props = { rideId: string };

export default function Completed({ rideId }: Props) {
  const [, nav] = useLocation();
  const [ride, setRide] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [rated, setRated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getRide(rideId).then(d => setRide(d.ride ?? d)).catch(() => {});
  }, [rideId]);

  const handleRate = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await api.rateRide(rideId, rating, comment || undefined);
      setRated(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fmt = (v?: number | string) => v != null ? `₹${parseFloat(String(v)).toFixed(0)}` : "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 p-6 border border-gray-100 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Trip Completed!</h1>
          <p className="text-gray-500 mt-1 text-sm">Thanks for riding with us</p>

          {ride && (
            <div className="mt-5 bg-gray-50 rounded-2xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">From</span>
                <span className="font-semibold text-right max-w-[60%] truncate">{ride.pickupAddress}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">To</span>
                <span className="font-semibold text-right max-w-[60%] truncate">{ride.dropAddress}</span>
              </div>
              <div className="border-t border-gray-200 my-1" />
              <div className="flex justify-between">
                <span className="text-gray-500 text-sm">Fare Paid</span>
                <span className="font-black text-xl text-green-600">{fmt(ride.fare)}</span>
              </div>
              {ride.riderName && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Driver</span>
                  <span className="font-semibold">{ride.riderName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {!rated ? (
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-100 p-6 border border-gray-100">
            <p className="font-bold text-gray-800 mb-3 text-center">Rate your experience</p>
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-3xl transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${(hoverRating || rating) >= s ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Leave a comment (optional)"
                rows={2}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:outline-none resize-none mb-3"
              />
            )}
            <button
              onClick={handleRate}
              disabled={rating === 0 || loading}
              className="w-full bg-amber-500 text-white font-black rounded-2xl py-3 disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Submit Rating"}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-4 text-center border border-gray-100">
            <p className="text-green-600 font-bold">Thanks for your feedback! ⭐</p>
          </div>
        )}

        <button
          onClick={() => nav("/")}
          className="w-full bg-gray-900 text-white font-black rounded-2xl py-4 flex items-center justify-center gap-2 shadow-lg"
        >
          <RotateCcw size={18} /> Book Another Ride
        </button>
      </div>
    </div>
  );
}
