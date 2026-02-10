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
      'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/activities',
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
        'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/cattle',
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
        'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/cattle/' + id,
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

      {isModalOpen && <AddCattleModal onClose={() => setIsModalOpen(false)} onSuccess={loadCattle} currentUser={props.currentUser} />}
      {selectedCattle && (
        <CattleDetailsModal cattle={selectedCattle} onClose={() => setSelectedCattle(null)} onUpdate={loadCattle} onDelete={handleDelete} currentUser={props.currentUser} />
      )}
    </div>
  );
}

function AddCattleModal(props: { onClose: () => void; onSuccess: () => void; currentUser: string }) {
  const [formData, setFormData] = useState({
    name: '',
    breed: '',
    dateOfBirth: '',
    sex: 'female',
    servedDate: '',
    matingBreed: '',
    expectedCalfBirthDate: '',
    calfBirthDate: '',
    calfSex: '',
    driedDate: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = '';

      if (imageFile) {
        const formDataImg = new FormData();
        formDataImg.append('file', imageFile);

        const uploadResponse = await fetch(
          'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/upload-image',
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + publicAnonKey,
            },
            body: formDataImg,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      const cattleData: Record<string, string> = {
        name: formData.name,
        breed: formData.breed,
        dateOfBirth: formData.dateOfBirth,
        sex: formData.sex,
        createdBy: props.currentUser,
        lastEditedBy: props.currentUser,
        lastEditedAt: new Date().toISOString(),
      };

      if (imageUrl) cattleData.imageUrl = imageUrl;
      if (formData.sex === 'female') {
        if (formData.servedDate) cattleData.servedDate = formData.servedDate;
        if (formData.matingBreed) cattleData.matingBreed = formData.matingBreed;
        if (formData.expectedCalfBirthDate) cattleData.expectedCalfBirthDate = formData.expectedCalfBirthDate;
        if (formData.calfBirthDate) cattleData.calfBirthDate = formData.calfBirthDate;
        if (formData.calfSex) cattleData.calfSex = formData.calfSex;
        if (formData.driedDate) cattleData.driedDate = formData.driedDate;
      }

      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/cattle',
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

      const createdCattle = await response.json();

      // Store audit info in localStorage as backup
      if (createdCattle.id) {
        try {
          const auditData = JSON.parse(localStorage.getItem('cattleAudit') || '{}');
          auditData[createdCattle.id] = {
            createdBy: props.currentUser,
            lastEditedBy: props.currentUser,
            lastEditedAt: new Date().toISOString(),
          };
          localStorage.setItem('cattleAudit', JSON.stringify(auditData));
        } catch (err) {
          console.error('Failed to save cattle audit:', err);
        }
      }

      logActivity({
        user: props.currentUser,
        action: 'add',
        category: 'cattle',
        target: formData.name,
        details: `Added ${formData.sex} ${formData.breed} cattle "${formData.name}"`,
      });

      props.onSuccess();
      props.onClose();
    } catch (error) {
      console.error('Error adding cattle:', error);
      window.alert('Failed to add cattle');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full overflow-y-auto" style={{ maxWidth: '42rem', maxHeight: '90vh' }}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Add New Cattle</h2>
          <button onClick={props.onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Cattle Photo</label>
            {imagePreview ? (
              <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview('');
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white px-2 py-1 rounded text-xs"
                >
                  Remove
                </button>
              </div>
            ) : (
              <label className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50">
                <span className="text-sm text-gray-500">Upload</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Breed *</label>
              <input
                type="text"
                required
                value={formData.breed}
                onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Sex *</label>
              <select
                value={formData.sex}
                onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
          </div>

          {formData.sex === 'female' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Breeding Information (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Served Date</label>
                  <input
                    type="date"
                    value={formData.servedDate}
                    onChange={(e) => setFormData({ ...formData, servedDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Breed of Bull</label>
                  <input
                    type="text"
                    value={formData.matingBreed}
                    onChange={(e) => setFormData({ ...formData, matingBreed: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Expected Calf Birth</label>
                  <input
                    type="date"
                    value={formData.expectedCalfBirthDate}
                    onChange={(e) => setFormData({ ...formData, expectedCalfBirthDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Actual Calf Birth</label>
                  <input
                    type="date"
                    value={formData.calfBirthDate}
                    onChange={(e) => setFormData({ ...formData, calfBirthDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Calf Sex</label>
                  <select
                    value={formData.calfSex}
                    onChange={(e) => setFormData({ ...formData, calfSex: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Not specified</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Dried Date</label>
                  <input
                    type="date"
                    value={formData.driedDate}
                    onChange={(e) => setFormData({ ...formData, driedDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={props.onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-400"
            >
              {uploading ? 'Saving...' : 'Add Cattle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CattleDetailsModal(props: { cattle: Cattle; onClose: () => void; onUpdate: () => void; onDelete: (id: string) => void; currentUser: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState('');
  const [editData, setEditData] = useState({
    servedDate: props.cattle.servedDate || '',
    matingBreed: props.cattle.matingBreed || '',
    expectedCalfBirthDate: props.cattle.expectedCalfBirthDate || '',
    calfBirthDate: props.cattle.calfBirthDate || '',
    calfSex: props.cattle.calfSex || '',
    driedDate: props.cattle.driedDate || '',
  });
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
  const [milkLoading, setMilkLoading] = useState(false);

  useEffect(() => {
    if (props.cattle.sex === 'female') {
      loadMilkRecords();
    }
  }, []);

  const loadMilkRecords = async () => {
    setMilkLoading(true);
    try {
      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/milk',
        {
          headers: {
            Authorization: 'Bearer ' + publicAnonKey,
          },
        }
      );
      if (!response.ok) {
        console.error('Failed to load milk records, status:', response.status);
        return;
      }
      const data = await response.json();
      const records: MilkRecord[] = Array.isArray(data) ? data : [];
      const cowRecords = records.filter((r) => r.cowName.trim().toLowerCase() === props.cattle.name.trim().toLowerCase())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setMilkRecords(cowRecords);
    } catch (error) {
      console.error('Error loading milk records:', error);
    } finally {
      setMilkLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let imageUrl = props.cattle.imageUrl;

      // Upload new image if selected
      if (newImageFile) {
        const formDataImg = new FormData();
        formDataImg.append('file', newImageFile);

        const uploadResponse = await fetch(
          'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/upload-image',
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer ' + publicAnonKey,
            },
            body: formDataImg,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
      }

      // Build the full updated cattle record
      // Detect what was changed
      const changes: string[] = [];
      if (newImageFile) changes.push('Photo');
      if ((editData.servedDate || '') !== (props.cattle.servedDate || '')) changes.push('Served Date');
      if ((editData.matingBreed || '') !== (props.cattle.matingBreed || '')) changes.push('Mating Breed');
      if ((editData.expectedCalfBirthDate || '') !== (props.cattle.expectedCalfBirthDate || '')) changes.push('Expected Calf Birth');
      if ((editData.calfBirthDate || '') !== (props.cattle.calfBirthDate || '')) changes.push('Calf Birth Date');
      if ((editData.calfSex || '') !== (props.cattle.calfSex || '')) changes.push('Calf Sex');
      if ((editData.driedDate || '') !== (props.cattle.driedDate || '')) changes.push('Dried Date');
      const editedField = changes.length > 0 ? changes.join(', ') : 'Breeding Info';

      const updatedCattle: Record<string, string | undefined> = {
        name: props.cattle.name,
        breed: props.cattle.breed,
        dateOfBirth: props.cattle.dateOfBirth,
        sex: props.cattle.sex,
        imageUrl: imageUrl,
        createdBy: props.cattle.createdBy || props.currentUser,
        lastEditedBy: props.currentUser,
        lastEditedAt: new Date().toISOString(),
        lastEditedField: editedField,
        servedDate: editData.servedDate || undefined,
        matingBreed: editData.matingBreed || undefined,
        expectedCalfBirthDate: editData.expectedCalfBirthDate || undefined,
        calfBirthDate: editData.calfBirthDate || undefined,
        calfSex: editData.calfSex || undefined,
        driedDate: editData.driedDate || undefined,
      };

      // Remove undefined values
      const cleanData: Record<string, string> = {};
      for (const [key, value] of Object.entries(updatedCattle)) {
        if (value !== undefined) cleanData[key] = value;
      }

      // Delete the old record and re-create with updated data
      const deleteResponse = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/cattle/' + props.cattle.id,
        {
          method: 'DELETE',
          headers: {
            Authorization: 'Bearer ' + publicAnonKey,
          },
        }
      );

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete old cattle record');
      }

      const createResponse = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/cattle',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + publicAnonKey,
          },
          body: JSON.stringify(cleanData),
        }
      );

      if (!createResponse.ok) {
        throw new Error('Failed to create updated cattle record');
      }

      const updatedRecord = await createResponse.json();

      // Store audit info in localStorage
      if (updatedRecord.id) {
        try {
          const auditData = JSON.parse(localStorage.getItem('cattleAudit') || '{}');
          auditData[updatedRecord.id] = {
            createdBy: props.cattle.createdBy || props.currentUser,
            lastEditedBy: props.currentUser,
            lastEditedAt: new Date().toISOString(),
            lastEditedField: editedField,
          };
          // Remove old ID audit if it changed
          if (updatedRecord.id !== props.cattle.id) {
            delete auditData[props.cattle.id];
          }
          localStorage.setItem('cattleAudit', JSON.stringify(auditData));
        } catch (err) {
          console.error('Failed to save cattle audit:', err);
        }
      }

      logActivity({
        user: props.currentUser,
        action: 'edit',
        category: 'cattle',
        target: props.cattle.name,
        details: `Edited ${editedField} for "${props.cattle.name}"`,
      });

      props.onUpdate();
      setIsEditing(false);
      props.onClose();
    } catch (error) {
      console.error('Error updating cattle:', error);
      window.alert('Failed to update breeding information');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full overflow-y-auto" style={{ maxWidth: '42rem', maxHeight: '90vh' }}>
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">{props.cattle.name}</h2>
          <button onClick={props.onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Image section with edit capability */}
          <div style={{ position: 'relative' }}>
            {(newImagePreview || props.cattle.imageUrl) ? (
              <ImageWithFallback
                src={newImagePreview || props.cattle.imageUrl}
                alt={props.cattle.name}
                className="w-full h-64 object-cover rounded-lg"
                onError={(e) => console.error('Failed to load image for', props.cattle.name)}
              />
            ) : (
              <div
                className="w-full flex items-center justify-center rounded-lg"
                style={{ height: '16rem', background: '#e5e7eb', fontSize: '4rem', color: '#9ca3af' }}
              >
                🐄
              </div>
            )}
            <label
              style={{
                position: 'absolute',
                bottom: '0.5rem',
                right: '0.5rem',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '0.375rem 0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              📷 Change Photo
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </label>
            {newImagePreview && (
              <button
                onClick={() => { setNewImageFile(null); setNewImagePreview(''); }}
                style={{
                  position: 'absolute',
                  top: '0.5rem',
                  right: '0.5rem',
                  background: 'rgba(220,38,38,0.85)',
                  color: 'white',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.75rem',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ✕ Undo
              </button>
            )}
          </div>

          {newImagePreview && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm text-white rounded-lg"
                style={{ padding: '0.375rem 1rem', background: saving ? '#9ca3af' : '#16a34a', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Saving...' : 'Save Photo'}
              </button>
            </div>
          )}

          <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
            <h3 className="text-lg font-semibold" style={{ marginBottom: '0.75rem', color: '#065f46' }}>Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Name</p>
                <p className="font-medium">{props.cattle.name}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Breed</p>
                <p className="font-medium">{props.cattle.breed}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Date of Birth</p>
                <p className="font-medium">{formatDate(props.cattle.dateOfBirth)}</p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Sex</p>
                <p className="font-medium capitalize">{props.cattle.sex}</p>
              </div>
            </div>
          </div>

          {props.cattle.sex === 'female' && (
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold" style={{ color: '#065f46' }}>Breeding Information</h3>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Served Date</label>
                    <input
                      type="date"
                      value={editData.servedDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, servedDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Breed of Bull</label>
                    <input
                      type="text"
                      value={editData.matingBreed}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, matingBreed: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Expected Calf Birth</label>
                    <input
                      type="date"
                      value={editData.expectedCalfBirthDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, expectedCalfBirthDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Actual Calf Birth</label>
                    <input
                      type="date"
                      value={editData.calfBirthDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, calfBirthDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Calf Sex</label>
                    <select
                      value={editData.calfSex}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditData({ ...editData, calfSex: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">Not specified</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dried Date</label>
                    <input
                      type="date"
                      value={editData.driedDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, driedDate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div className="col-span-1 md:col-span-2 flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Served Date</p>
                      <p className="font-medium">{formatDate(props.cattle.servedDate)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Mating Breed</p>
                      <p className="font-medium">{props.cattle.matingBreed || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Expected Calf Birth</p>
                      <p className="font-medium">{formatDate(props.cattle.expectedCalfBirthDate)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Actual Calf Birth</p>
                      <p className="font-medium">{formatDate(props.cattle.calfBirthDate)}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Calf Sex</p>
                      <p className="font-medium capitalize">{props.cattle.calfSex || 'N/A'}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Dried Date</p>
                      <p className="font-medium">{formatDate(props.cattle.driedDate)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Milk Production History for females */}
          {props.cattle.sex === 'female' && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold" style={{ color: '#065f46', marginBottom: '0.75rem' }}>🥛 Milk Production History</h3>
              {milkLoading ? (
                <p className="text-sm text-gray-500">Loading milk records...</p>
              ) : milkRecords.length === 0 ? (
                <p className="text-sm text-gray-500">No milk records found for this cow.</p>
              ) : (
                <div>
                  <div style={{ background: '#f0fdf4', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Records</p>
                      <p className="font-bold">{milkRecords.length}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Production</p>
                      <p className="font-bold" style={{ color: '#16a34a' }}>{milkRecords.reduce((s: number, r: MilkRecord) => s + Number(r.totalDaily), 0).toFixed(2)} KG</p>
                    </div>
                    <div>
                      <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>Average/Day</p>
                      <p className="font-bold" style={{ color: '#2563eb' }}>{(milkRecords.reduce((s: number, r: MilkRecord) => s + Number(r.totalDaily), 0) / milkRecords.length).toFixed(2)} KG</p>
                    </div>
                  </div>
                  <div style={{ maxHeight: '12rem', overflowY: 'auto' }}>
                    <table className="w-full" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ textAlign: 'left', padding: '0.375rem 0.5rem', color: '#6b7280', fontWeight: 500 }}>Date</th>
                          <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem', color: '#6b7280', fontWeight: 500 }}>AM</th>
                          <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem', color: '#6b7280', fontWeight: 500 }}>PM</th>
                          <th style={{ textAlign: 'right', padding: '0.375rem 0.5rem', color: '#6b7280', fontWeight: 500 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {milkRecords.map((record) => (
                          <tr key={record.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.375rem 0.5rem' }}>{new Date(record.date).toLocaleDateString()}</td>
                            <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>{Number(record.morningAmount).toFixed(1)}</td>
                            <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right' }}>{Number(record.eveningAmount).toFixed(1)}</td>
                            <td style={{ padding: '0.375rem 0.5rem', textAlign: 'right', fontWeight: 600, color: '#16a34a' }}>{Number(record.totalDaily).toFixed(1)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Age calculation */}
          <div style={{ background: '#f9fafb', borderRadius: '0.5rem', padding: '1rem' }}>
            <h3 className="text-lg font-semibold" style={{ marginBottom: '0.5rem', color: '#065f46' }}>Additional Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Age</p>
                <p className="font-medium">
                  {(() => {
                    const birth = new Date(props.cattle.dateOfBirth);
                    const now = new Date();
                    const years = now.getFullYear() - birth.getFullYear();
                    const months = now.getMonth() - birth.getMonth();
                    const totalMonths = years * 12 + months;
                    if (totalMonths < 12) return totalMonths + ' months';
                    const y = Math.floor(totalMonths / 12);
                    const m = totalMonths % 12;
                    return y + ' year' + (y !== 1 ? 's' : '') + (m > 0 ? ', ' + m + ' month' + (m !== 1 ? 's' : '') : '');
                  })()}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.125rem' }}>Category</p>
                <p className="font-medium">{props.cattle.sex === 'female' ? 'Cow' : 'Bull'}</p>
              </div>
              {(props.cattle.createdBy || props.cattle.lastEditedBy) && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#eff6ff', borderRadius: '0.5rem', border: '1px solid #bfdbfe' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>📋 Audit Trail</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                    {props.cattle.createdBy && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#dbeafe', fontSize: '0.7rem' }}>👤</span>
                        <div>
                          <p style={{ fontSize: '0.65rem', color: '#6b7280', lineHeight: 1 }}>Created by</p>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e3a5f' }}>{props.cattle.createdBy}</p>
                        </div>
                      </div>
                    )}
                    {props.cattle.lastEditedBy && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#fef3c7', fontSize: '0.7rem' }}>✏️</span>
                        <div>
                          <p style={{ fontSize: '0.65rem', color: '#6b7280', lineHeight: 1 }}>Last edited by</p>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>{props.cattle.lastEditedBy}</p>
                          {props.cattle.lastEditedField && (
                            <p style={{ fontSize: '0.65rem', color: '#d97706', marginTop: '0.125rem' }}>Changed: {props.cattle.lastEditedField}</p>
                          )}
                          {props.cattle.lastEditedAt && (
                            <p style={{ fontSize: '0.6rem', color: '#9ca3af', marginTop: '0.125rem' }}>{new Date(props.cattle.lastEditedAt).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t px-6 py-4" style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={props.onClose} className="bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200" style={{ flex: 1 }}>
            Close
          </button>
          <button
            onClick={() => { props.onDelete(props.cattle.id); props.onClose(); }}
            className="px-4 py-2 rounded-lg text-white"
            style={{ background: '#dc2626', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            🗑️ Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function MilkProduction(props: { currentUser: string }) {
  const [milkRecords, setMilkRecords] = useState<MilkRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterCow, setFilterCow] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [femaleCattle, setFemaleCattle] = useState<string[]>([]);

  useEffect(() => {
    loadMilkRecords();
    loadFemaleCattle();
  }, []);

  const loadFemaleCattle = async () => {
    try {
      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/cattle',
        {
          headers: {
            Authorization: 'Bearer ' + publicAnonKey,
          },
        }
      );
      if (!response.ok) return;
      const data: Cattle[] = await response.json();
      const females = data.filter((c) => c.sex === 'female').map((c) => c.name).sort();
      setFemaleCattle(females);
    } catch (error) {
      console.error('Error loading female cattle:', error);
    }
  };

  const loadMilkRecords = async () => {
    try {
      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/milk',
        {
          headers: {
            Authorization: 'Bearer ' + publicAnonKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load milk records');
      }

      const data = await response.json();
      // Merge addedBy from localStorage (server doesn't persist it yet)
      const auditData = JSON.parse(localStorage.getItem('milkAudit') || '{}');
      const enrichedData = (Array.isArray(data) ? data : []).map((record: MilkRecord) => ({
        ...record,
        addedBy: record.addedBy || auditData[record.id] || '',
      }));
      setMilkRecords(enrichedData);
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
        'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/milk/' + id,
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
        details: `Deleted milk record for "${recordToDelete?.cowName || id}" on ${recordToDelete?.date || 'unknown date'} (${Number(recordToDelete?.totalDaily || 0).toFixed(2)} KG)`,
      });

      await loadMilkRecords();
    } catch (error) {
      console.error('Error deleting milk record:', error);
      window.alert('Failed to delete milk record');
    }
  };

  const uniqueCows = Array.from(new Set(milkRecords.map(r => r.cowName))).sort();

  const filteredRecords = milkRecords.filter((record) => {
    const matchesCow = filterCow === 'all' || record.cowName === filterCow;
    const matchesDate = !filterDate || record.date === filterDate;
    return matchesCow && matchesDate;
  });

  const totalProduction = filteredRecords.reduce((sum: number, record: MilkRecord) => sum + Number(record.totalDaily), 0);
  const avgProduction = filteredRecords.length > 0 ? totalProduction / filteredRecords.length : 0;

  // Group records by date for daily summary
  const dailySummaries = filteredRecords.reduce<Record<string, { date: string; cows: { name: string; amount: number }[]; total: number }>>((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = { date: record.date, cows: [], total: 0 };
    }
    acc[record.date].cows.push({ name: record.cowName, amount: Number(record.totalDaily) });
    acc[record.date].total += Number(record.totalDaily);
    return acc;
  }, {});

  const sortedDailySummaries = Object.values(dailySummaries).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Milk Production</h2>
          <p className="text-gray-600 mt-1">{milkRecords.length} records total</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          ➕ Add Record
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Records</p>
          <p className="text-3xl font-bold text-gray-900">{filteredRecords.length}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Total Production (KG)</p>
          <p className="text-3xl font-bold text-green-600">{totalProduction.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <p className="text-sm text-gray-600 mb-1">Average Per Record (KG)</p>
          <p className="text-3xl font-bold text-blue-600">{avgProduction.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Filter by Cow</label>
            <select
              value={filterCow}
              onChange={(e) => setFilterCow(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="all">All Cows</option>
              {uniqueCows.map(cow => (
                <option key={cow} value={cow}>{cow}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-2">Filter by Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>

          {(filterCow !== 'all' || filterDate) && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilterCow('all');
                  setFilterDate('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 underline"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-gray-600 mt-2">Loading...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-600">No records found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cow Name</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Morning (KG)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Evening (KG)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total (KG)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Added By</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y">
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {record.cowName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      {Number(record.morningAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      {Number(record.eveningAmount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right">
                      {Number(record.totalDaily).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {record.addedBy ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#eff6ff', color: '#1e40af', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 500 }}>
                          👤 {record.addedBy}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleDelete(record.id)}
                        className="text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && sortedDailySummaries.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-green-50">
            <h3 className="text-lg font-bold text-green-800">📊 Daily Production Summary</h3>
            <p className="text-sm text-green-600 mt-1">Total milk produced by all cows each day</p>
          </div>
          <div className="divide-y">
            {sortedDailySummaries.map((day) => (
              <div key={day.date} className="px-4 sm:px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      {day.cows.map((c, i) => (
                        <p key={i}>• {c.name}: <span className="font-medium">{c.amount.toFixed(2)} KG</span></p>
                      ))}
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-center sm:items-end gap-1 bg-green-50 sm:bg-transparent rounded-lg px-3 py-2 sm:p-0 sm:ml-4 shrink-0">
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{day.total.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">KG total</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isModalOpen && (
        <AddMilkRecordModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadMilkRecords}
          femaleCows={femaleCattle}
          currentUser={props.currentUser}
        />
      )}
    </div>
  );
}

function AddMilkRecordModal(props: { 
  onClose: () => void; 
  onSuccess: () => void; 
  femaleCows: string[];
  currentUser: string;
}) {
  const [formData, setFormData] = useState({
    cowName: '',
    date: new Date().toISOString().split('T')[0],
    morningAmount: '',
    eveningAmount: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const morningAmount = parseFloat(formData.morningAmount) || 0;
    const eveningAmount = parseFloat(formData.eveningAmount) || 0;

    try {
      const response = await fetch(
        'https://' + projectId + '.supabase.co/functions/v1/make-server-211b61e5/milk',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + publicAnonKey,
          },
          body: JSON.stringify({
            cowName: formData.cowName,
            date: formData.date,
            morningAmount,
            eveningAmount,
            addedBy: props.currentUser,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add milk record');
      }

      const createdRecord = await response.json();

      // Store addedBy in localStorage since the server doesn't persist it yet
      if (createdRecord.id) {
        try {
          const auditData = JSON.parse(localStorage.getItem('milkAudit') || '{}');
          auditData[createdRecord.id] = props.currentUser;
          localStorage.setItem('milkAudit', JSON.stringify(auditData));
        } catch (err) {
          console.error('Failed to save audit data:', err);
        }
      }

      logActivity({
        user: props.currentUser,
        action: 'add',
        category: 'milk',
        target: formData.cowName,
        details: `Added milk record for "${formData.cowName}" on ${formData.date} (Morning: ${morningAmount} KG, Evening: ${eveningAmount} KG, Total: ${(morningAmount + eveningAmount).toFixed(2)} KG)`,
      });

      props.onSuccess();
      props.onClose();
    } catch (error) {
      console.error('Error adding milk record:', error);
      window.alert('Failed to add milk record');
    }
  };

  const totalDaily = (parseFloat(formData.morningAmount) || 0) + (parseFloat(formData.eveningAmount) || 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">Add Milk Record</h2>
          <button onClick={props.onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Cow Name *</label>
            {props.femaleCows.length > 0 ? (
              <select
                value={formData.cowName}
                onChange={(e) => setFormData({ ...formData, cowName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Select a cow...</option>
                {props.femaleCows.map(cow => (
                  <option key={cow} value={cow}>{cow}</option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500">No female cattle registered. Add female cattle first.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Morning Milk (KG) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.morningAmount}
              onChange={(e) => setFormData({ ...formData, morningAmount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Evening Milk (KG) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.eveningAmount}
              onChange={(e) => setFormData({ ...formData, eveningAmount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="0.00"
              required
            />
          </div>

          {(formData.morningAmount || formData.eveningAmount) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Total Daily Production:</span>
                <span className="text-2xl font-bold text-green-600 ml-2">
                  {totalDaily.toFixed(2)} KG
                </span>
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={props.onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={props.femaleCows.length === 0 || !formData.cowName}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Add Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

