import { useState, useEffect } from 'react';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { ActivityLog } from './components/ActivityLog';

const projectId = (import.meta.env.VITE_SUPABASE_URL ?? '').replace('https://', '').split('.')[0];
const publicAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

interface Cattle {
  id: string;
  name: string;
  breed: string;
  dateOfBirth: string;
  sex: string;
  imageUrl?: string;
  servedDate?: string;
  matingBreed?: string;
  expectedCalfBirthDate?: string;
  calfBirthDate?: string;
  calfSex?: string;
  driedDate?: string;
  createdBy?: string;
  lastEditedBy?: string;
  lastEditedAt?: string;
  lastEditedField?: string;
}

interface MilkRecord {
  id: string;
  cowName: string;
  date: string;
  morningAmount: number;
  eveningAmount: number;
  totalDaily: number;
  addedBy?: string;
}

interface ActivityEntry {
  id: string;
  timestamp: string;
  user: string;
  action: 'add' | 'edit' | 'delete';
  category: 'cattle' | 'milk';
  target: string;
  details: string;
}

// Helper to log an activity to Supabase (shared across all users)
async function logActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>) {
  try {
    // Save to backend for sharing across users
    const response = await fetch(
      'https://' + projectId + '.supabase.co/functions/v1/make-server/activities',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + publicAnonKey,
        },
        body: JSON.stringify(entry),
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to log activity to server');
    }
    
    // Also keep in localStorage for local fallback
    const localLog: ActivityEntry[] = JSON.parse(localStorage.getItem('activityLog') || '[]');
    localLog.unshift({
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      timestamp: new Date().toISOString(),
    });
    localStorage.setItem('activityLog', JSON.stringify(localLog.slice(0, 100)));
  } catch (err) {
    console.error('Failed to log activity:', err);
    // Fallback to localStorage
    try {
      const log: ActivityEntry[] = JSON.parse(localStorage.getItem('activityLog') || '[]');
      log.unshift({
        ...entry,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('activityLog', JSON.stringify(log));
    } catch (e) {
      console.error('Failed to save activity locally:', e);
    }
  }
}

// Allowed users (only these 2 can log in)
const ALLOWED_USERS = [
  { username: 'Lazarus', password: 'Lazarus2026' },
  { username: 'Farmer2', password: 'Farmer2026' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('cattle');
  const [user, setUser] = useState<string | null>(() => {
    return sessionStorage.getItem('cattle_app_user');
  });

  const handleLogin = (username: string) => {
    sessionStorage.setItem('cattle_app_user', username);
    setUser(username);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('cattle_app_user');
    setUser(null);
  };

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-3xl font-bold" style={{ lineHeight: 1.2 }}>Cattle Information Keeper</h1>
            <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
              <span className="text-green-100" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>👤 {user}</span>
              <button
                onClick={handleLogout}
                className="bg-green-800 hover:bg-green-900 text-white rounded-lg"
                style={{ padding: '0.25rem 0.625rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              >
                Logout
              </button>
            </div>
          </div>
          <p className="text-green-100 mt-1" style={{ fontSize: '0.75rem' }}>Farm Management System</p>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('cattle')}
              className={'flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ' + (activeTab === 'cattle' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-gray-800')}
            >
              🐄 Cattle Records
            </button>
            <button
              onClick={() => setActiveTab('milk')}
              className={'flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ' + (activeTab === 'milk' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-gray-800')}
            >
              🥛 Milk Production
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={'flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-colors ' + (activeTab === 'activity' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-600 hover:text-gray-800')}
            >
              📋 Activity Log
            </button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {activeTab === 'cattle' ? <CattleRecords currentUser={user} /> : activeTab === 'milk' ? <MilkProduction currentUser={user} /> : <ActivityLog />}
      </main>
    </div>
  );
}

function LoginScreen(props: { onLogin: (username: string) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const matched = ALLOWED_USERS.find(
        (u) => u.username === username && u.password === password
      );

      if (matched) {
        props.onLogin(matched.username);
      } else {
        setError('Invalid credentials');
        setIsLoading(false);
      }
    }, 500);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #065f46 0%, #064e3b 50%, #134e4a 100%)' }}
    >
      <div style={{ position: 'relative', width: '100%', maxWidth: '22rem' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'inline-block',
              width: '4.5rem',
              height: '4.5rem',
              lineHeight: '4.5rem',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: '2rem',
              textAlign: 'center',
            }}
          >
            🐄
          </div>
          <h1 className="text-xl font-bold text-white" style={{ marginTop: '1rem' }}>
            Cattle Keeper
          </h1>
          <p style={{ color: 'rgba(167, 243, 208, 0.7)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Farm Management System
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-lg p-6"
          style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && (
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                }}
              >
                {error}
              </div>
            )}

            <div>
              <input
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  outline: 'none',
                  fontSize: '1rem',
                  color: 'white',
                  boxSizing: 'border-box',
                }}
                placeholder="Username"
                autoComplete="username"
                autoCapitalize="off"
                required
              />
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 2.5rem 0.75rem 1rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  outline: 'none',
                  fontSize: '1rem',
                  color: 'white',
                  boxSizing: 'border-box',
                }}
                placeholder="Password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.5)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                fontSize: '1rem',
                color: 'white',
                background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                border: 'none',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded-full animate-spin"
                    style={{ border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                  ></span>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '1.5rem', color: 'rgba(255,255,255,0.25)' }}>
          Authorized access only
        </p>
      </div>
    </div>
  );
}

function CattleRecords(props: { currentUser: string }) {
  const [cattleList, setCattleList] = useState<Cattle[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCattle, setSelectedCattle] = useState<Cattle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSex, setFilterSex] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCattle();
  }, []);

  const loadCattle = async () => {
    try {
      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server/cattle',
        {
          headers: {
            Authorization: 'Bearer ' + publicAnonKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load cattle');
      }

      const data = await response.json();
      // Merge audit info from localStorage for records that don't have it from server
      const auditData = JSON.parse(localStorage.getItem('cattleAudit') || '{}');
      const enrichedData = (Array.isArray(data) ? data : []).map((cattle: Cattle) => {
        const audit = auditData[cattle.id];
        return {
          ...cattle,
          createdBy: cattle.createdBy || (audit ? audit.createdBy : ''),
          lastEditedBy: cattle.lastEditedBy || (audit ? audit.lastEditedBy : ''),
          lastEditedAt: cattle.lastEditedAt || (audit ? audit.lastEditedAt : ''),
          lastEditedField: cattle.lastEditedField || (audit ? audit.lastEditedField : ''),
        };
      });
      setCattleList(enrichedData);
    } catch (error) {
      console.error('Error loading cattle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const cattleToDelete = cattleList.find((c) => c.id === id);
    if (!window.confirm('Are you sure you want to delete this cattle record?')) {
      return;
    }

    try {
      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server/cattle/' + id,
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer ' + publicAnonKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete cattle');
      }

      logActivity({
        user: props.currentUser,
        action: 'delete',
        category: 'cattle',
        target: cattleToDelete?.name || id,
        details: `Deleted cattle "${cattleToDelete?.name || id}" (${cattleToDelete?.breed || 'unknown breed'})`,
      });

      await loadCattle();
    } catch (error) {
      console.error('Error deleting cattle:', error);
      window.alert('Failed to delete cattle');
    }
  };

  const filteredCattle = cattleList.filter((cattle) => {
    const matchesSearch = cattle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cattle.breed.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSex = filterSex === 'all' || cattle.sex === filterSex;
    return matchesSearch && matchesSex;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Cattle Records</h2>
          <p className="text-gray-600 mt-1">{cattleList.length} animals registered</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          ➕ Add Cattle
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search by name or breed..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <select
            value={filterSex}
            onChange={(e) => setFilterSex(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="all">All Animals</option>
            <option value="female">Females Only</option>
            <option value="male">Males Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      ) : filteredCattle.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-600">No cattle records found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCattle.map((cattle) => {
            const sexBadge = cattle.sex === 'female' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800';
            const sexLabel = cattle.sex === 'female' ? 'Female' : 'Male';

            return (
              <div key={cattle.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="relative h-48 bg-gray-200">
                  {cattle.imageUrl ? (
                    <ImageWithFallback 
                      src={cattle.imageUrl} 
                      alt={cattle.name} 
                      className="w-full h-full object-cover"
                      onError={(e) => console.error('Failed to load image for', cattle.name, ':', cattle.imageUrl)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
                      🐄
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <span className={'px-3 py-1 rounded-full text-sm font-medium ' + sexBadge}>
                      {sexLabel}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900">{cattle.name}</h3>
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Breed:</span> {cattle.breed}
                    </div>
                    <div className="text-xs text-gray-500">
                      Born: {new Date(cattle.dateOfBirth).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCattle(cattle)}
                    className="w-full text-sm font-medium text-white rounded-lg"
                    style={{ marginTop: '0.75rem', padding: '0.5rem', background: '#2563eb', border: 'none', cursor: 'pointer' }}
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <AddCattleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCattleAdded={loadCattle}
          currentUser={props.currentUser}
        />
      )}

      {selectedCattle && (
        <CattleDetailsModal
          cattle={selectedCattle}
          onClose={() => setSelectedCattle(null)}
          onUpdate={loadCattle}
          currentUser={props.currentUser}
        />
      )}
    </div>
  );
}

function AddCattleModal(props: { isOpen: boolean; onClose: () => void; onCattleAdded: () => void; currentUser: string }) {
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('female');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (!props.isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    try {
      let imageUrl = '';
      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const imageUploadResponse = await fetch(
          'https://' + projectId + '.supabase.co/functions/v1/make-server/upload-image',
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + publicAnonKey,
            },
            body: formData,
          }
        );

        if (!imageUploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const imageData = await imageUploadResponse.json();
        imageUrl = imageData.url;
      }

      const cattleData = {
        name,
        breed,
        dateOfBirth,
        sex,
        imageUrl,
        createdBy: props.currentUser,
      };

      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server/cattle',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + publicAnonKey,
          },
          body: JSON.stringify(cattleData),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add cattle');
      }

      // Store audit info in localStorage
      const auditData = JSON.parse(localStorage.getItem('cattleAudit') || '{}');
      const newCattle = await response.json();
      auditData[newCattle.id] = {
        createdBy: props.currentUser,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('cattleAudit', JSON.stringify(auditData));

      logActivity({
        user: props.currentUser,
        action: 'add',
        category: 'cattle',
        target: name,
        details: `Added new cattle: ${name} (${breed}, ${sex})`,
      });

      props.onCattleAdded();
      props.onClose();
    } catch (error) {
      console.error('Error adding cattle:', error);
      alert('Failed to add cattle. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add New Cattle</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Breed</label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sex</label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as 'male' | 'female')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {selectedImage && (
                <img src={selectedImage} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg" />
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="button"
                onClick={props.onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isUploading ? 'Adding...' : 'Add Cattle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CattleDetailsModal(props: { cattle: Cattle; onClose: () => void; onUpdate: () => void; currentUser: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCattle, setEditedCattle] = useState(props.cattle);
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = async () => {
    try {
      setIsUploading(true);
      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server/cattle/' + props.cattle.id,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + publicAnonKey,
          },
          body: JSON.stringify(editedCattle),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update cattle');
      }

      // Store audit info in localStorage
      const auditData = JSON.parse(localStorage.getItem('cattleAudit') || '{}');
      auditData[props.cattle.id] = {
        ...auditData[props.cattle.id],
        lastEditedBy: props.currentUser,
        lastEditedAt: new Date().toISOString(),
        lastEditedField: 'breeding_info',
      };
      localStorage.setItem('cattleAudit', JSON.stringify(auditData));

      logActivity({
        user: props.currentUser,
        action: 'edit',
        category: 'cattle',
        target: editedCattle.name,
        details: `Updated breeding information for ${editedCattle.name}`,
      });

      props.onUpdate();
      props.onClose();
    } catch (error) {
      console.error('Error updating cattle:', error);
      alert('Failed to update cattle');
    } finally {
      setIsUploading(false);
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold">{props.cattle.name}</h2>
            <button onClick={props.onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              {props.cattle.imageUrl ? (
                <img
                  src={props.cattle.imageUrl}
                  alt={props.cattle.name}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center text-6xl">
                  🐄
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-500">Breed</h3>
                <p className="text-lg">{props.cattle.breed}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-500">Date of Birth</h3>
                <p>{formatDate(props.cattle.dateOfBirth)}</p>
              </div>

              <div>
                <h3 className="font-medium text-gray-500">Sex</h3>
                <p>{props.cattle.sex === 'female' ? 'Female' : 'Male'}</p>
              </div>

              {props.cattle.sex === 'female' && (
                <>
                  <div>
                    <h3 className="font-medium text-gray-500">Served Date</h3>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editedCattle.servedDate || ''}
                        onChange={(e) => setEditedCattle({ ...editedCattle, servedDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p>{formatDate(props.cattle.servedDate)}</p>
                    )}
                  </div>

                  {editedCattle.servedDate && (
                    <div>
                      <h3 className="font-medium text-gray-500">Mating Breed</h3>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedCattle.matingBreed || ''}
                          onChange={(e) => setEditedCattle({ ...editedCattle, matingBreed: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Enter breed"
                        />
                      ) : (
                        <p>{props.cattle.matingBreed || 'N/A'}</p>
                      )}
                    </div>
                  )}

                  {editedCattle.servedDate && (
                    <div>
                      <h3 className="font-medium text-gray-500">Expected Calf Birth Date</h3>
                      {isEditing ? (
                        <input
                          type="date"
                          value={editedCattle.expectedCalfBirthDate || ''}
                          onChange={(e) => setEditedCattle({ ...editedCattle, expectedCalfBirthDate: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      ) : (
                        <p>{formatDate(props.cattle.expectedCalfBirthDate)}</p>
                      )}
                    </div>
                  )}

                  {props.cattle.calfBirthDate && (
                    <div>
                      <h3 className="font-medium text-gray-500">Calf Birth Date</h3>
                      <p>{formatDate(props.cattle.calfBirthDate)}</p>
                    </div>
                  )}

                  {props.cattle.calfSex && (
                    <div>
                      <h3 className="font-medium text-gray-500">Calf Sex</h3>
                      <p>{props.cattle.calfSex === 'female' ? 'Female' : 'Male'}</p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium text-gray-500">Dried Date</h3>
                    {isEditing ? (
                      <input
                        type="date"
                        value={editedCattle.driedDate || ''}
                        onChange={(e) => setEditedCattle({ ...editedCattle, driedDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p>{formatDate(props.cattle.driedDate)}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-6 pt-4 border-t">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={props.onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Breeding Info
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MilkProduction(props: { currentUser: string }) {
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cowNames, setCowNames] = useState<string[]>([]);

  useEffect(() => {
    loadMilkRecords();
  }, []);

  const loadMilkRecords = async () => {
    try {
      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server/milk',
        {
          headers: {
            Authorization: 'Bearer ' + publicAnonKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load milk records');
      }

      const data = await response.json() as MilkRecord[];
      setMilkRecords(data);
      
      // Extract unique cow names from records
      const uniqueNames: string[] = [...new Set(data.map((r) => r.cowName))];
      setCowNames(uniqueNames);
    } catch (error) {
      console.error('Error loading milk records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const recordToDelete = milkRecords.find((r) => r.id === id);
    if (!window.confirm('Are you sure you want to delete this milk record?')) {
      return;
    }

    try {
      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server/milk/' + id,
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer ' + publicAnonKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete milk record');
      }

      logActivity({
        user: props.currentUser,
        action: 'delete',
        category: 'milk',
        target: recordToDelete?.cowName || id,
        details: `Deleted milk record for ${recordToDelete?.cowName} on ${recordToDelete?.date}`,
      });

      await loadMilkRecords();
    } catch (error) {
      console.error('Error deleting milk record:', error);
      window.alert('Failed to delete milk record');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Milk Production</h2>
          <p className="text-gray-600 mt-1">{milkRecords.length} records</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          ➕ Add Record
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      ) : milkRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-600">No milk records found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Cow</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Morning (L)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Evening (L)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Total (L)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Added By</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {milkRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(record.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-medium">{record.cowName}</td>
                  <td className="px-4 py-3">{record.morningAmount}</td>
                  <td className="px-4 py-3">{record.eveningAmount}</td>
                  <td className="px-4 py-3 font-medium text-green-600">{record.totalDaily}</td>
                  <td className="px-4 py-3 text-gray-500">{record.addedBy || 'N/A'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <AddMilkModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onMilkAdded={loadMilkRecords}
          existingCowNames={cowNames}
          currentUser={props.currentUser}
        />
      )}
    </div>
  );
}

function AddMilkModal(props: { isOpen: boolean; onClose: () => void; onMilkAdded: () => void; existingCowNames: string[]; currentUser: string }) {
  const [cowName, setCowName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [morningAmount, setMorningAmount] = useState('');
  const [eveningAmount, setEveningAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!props.isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const morning = parseFloat(morningAmount) || 0;
      const evening = parseFloat(eveningAmount) || 0;
      const total = morning + evening;

      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server/milk',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + publicAnonKey,
          },
          body: JSON.stringify({
            cowName,
            date,
            morningAmount: morning,
            eveningAmount: evening,
            totalDaily: total,
            addedBy: props.currentUser,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add milk record');
      }

      logActivity({
        user: props.currentUser,
        action: 'add',
        category: 'milk',
        target: cowName,
        details: `Added milk record for ${cowName}: ${total}L (Morning: ${morning}L, Evening: ${evening}L)`,
      });

      props.onMilkAdded();
      props.onClose();
    } catch (error) {
      console.error('Error adding milk record:', error);
      alert('Failed to add milk record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Add Milk Record</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cow Name</label>
              <input
                type="text"
                value={cowName}
                onChange={(e) => setCowName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                list="cow-names"
                required
              />
              <datalist id="cow-names">
                {props.existingCowNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Morning Amount (L)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={morningAmount}
                onChange={(e) => setMorningAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Evening Amount (L)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={eveningAmount}
                onChange={(e) => setEveningAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div className="pt-4 flex gap-2">
              <button
                type="button"
                onClick={props.onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Record'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
