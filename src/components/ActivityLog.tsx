import { useState, useEffect } from 'react';
import { api, ActivityEntry } from '../api';

interface ActivityLogProps {}

export function ActivityLog(_props: ActivityLogProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const data = await api.activities.list();
      setEntries(data);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError('Failed to load activities from server');
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem('activityLog');
        if (raw) setEntries(JSON.parse(raw));
      } catch {
        setEntries([]);
      }
    } finally {
      setIsLoaded(true);
    }
  };

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'add': return { bgClass: 'bg-emerald-100', textClass: 'text-emerald-700', icon: '➕', label: 'Added' };
      case 'edit': return { bgClass: 'bg-amber-100', textClass: 'text-amber-700', icon: '✏️', label: 'Updated' };
      case 'delete': return { bgClass: 'bg-red-100', textClass: 'text-red-700', icon: '🗑️', label: 'Removed' };
      default: return { bgClass: 'bg-gray-100', textClass: 'text-gray-700', icon: '📋', label: action };
    }
  };

  const categoryConfig = (cat: string) => {
    switch (cat) {
      case 'cattle': return { icon: '🐄', label: 'Cattle' };
      case 'milk': return { icon: '🥛', label: 'Milk' };
      default: return { icon: '📋', label: cat };
    }
  };

  const groupedByDate: Record<string, ActivityEntry[]> = {};
  entries.forEach((entry: ActivityEntry) => {
    const dateKey = new Date(entry.timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!groupedByDate[dateKey]) groupedByDate[dateKey] = [];
    groupedByDate[dateKey].push(entry);
  });

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (!isLoaded) {
    return (
      <div className="py-20 text-center">
        <div className="inline-flex items-center gap-2.5 text-gray-400">
          <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin"></div>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activity Log</h2>
          <p className="text-gray-500 text-sm mt-1">Recent actions and changes from all users</p>
        </div>
        <button
          onClick={loadActivities}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm">
          {error} - Showing cached data. Make sure to deploy the updated Supabase function.
        </div>
      )}

      {/* Activity List */}
      {entries.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-600 font-medium">No activities yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Actions will appear here after you add, edit, or delete records
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {date}
                <span className="text-gray-400 font-normal">({items.length})</span>
              </h3>

              <div className="space-y-4">
                {items.map((entry) => {
                  const action = getActionConfig(entry.action);
                  const category = categoryConfig(entry.category);
                  
                  return (
                    <div
                      key={entry.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${action.bgClass}`}>
                          <span className="text-lg">{action.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">{entry.target}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${action.bgClass} ${action.textClass}`}>
                              {action.label}
                            </span>
                          </div>
                          
                          {entry.details && (
                            <p className="text-sm text-gray-600 mb-2">{entry.details}</p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              {category.icon} {category.label}
                            </span>
                            <span>•</span>
                            <span>{entry.user}</span>
                            <span>•</span>
                            <span>{formatTime(entry.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
