import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { PoliceAsset } from '../types.js';
import { Modal } from '../components/common/Modal.js';
import { 
  PackageCheck, 
  Plus, 
  Search, 
  Wrench
} from 'lucide-react';

export const AssetRegister: React.FC = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<PoliceAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Register Asset Modal
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Firearm');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('Hauz Khas Armory Vault');
  const [condition, setCondition] = useState('Excellent');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Status Update Modal
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<PoliceAsset | null>(null);
  const [newStatus, setNewStatus] = useState('Assigned');
  const [eventType, setEventType] = useState('ASSIGNMENT');
  const [toCustodian, setToCustodian] = useState('');
  const [statusDetails, setStatusDetails] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;

      const data = await api.getAssets(params);
      setAssets(data);
    } catch (err) {
      console.error('Error fetching assets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [search, typeFilter, statusFilter, user]);

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !serialNumber || !location) return;

    setIsSubmitting(true);
    try {
      await api.createAsset({
        name,
        type,
        serialNumber,
        department: user?.department || 'Crime Branch',
        location,
        condition
      });

      setIsRegisterOpen(false);
      setName('');
      setSerialNumber('');
      fetchAssets();
      alert('Police asset registered to inventory.');
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !statusDetails) return;

    setIsUpdating(true);
    try {
      await api.updateAssetStatus(selectedAsset.id, {
        status: newStatus,
        eventType,
        toCustodian: toCustodian || undefined,
        details: statusDetails
      });

      setIsUpdateModalOpen(false);
      setStatusDetails('');
      setToCustodian('');
      fetchAssets();
      alert('Asset lifecycle event logged.');
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const canManageAssets = ['supervisor', 'admin'].includes(user?.role || '');

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Official Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-200">
              <PackageCheck className="w-4 h-4 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Police Armory, Logistics & Asset Register
            </h1>
            <span className="status-pill-amber text-[10px]">
              LOGISTICS REGISTRY
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Lifecycle monitoring for service firearms, patrol vehicles, body-worn cameras, and forensic hardware
          </p>
        </div>

        {canManageAssets && (
          <button
            onClick={() => setIsRegisterOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold transition-all shadow-sm hover:shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Police Asset</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="gov-card p-3 rounded-2xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search asset number, serial number, model, custodian..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 font-mono transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
          >
            <option value="">All Asset Types</option>
            <option value="Vehicle">Patrol Vehicle</option>
            <option value="Firearm">Service Firearm</option>
            <option value="Forensic Equipment">Forensic Equipment</option>
            <option value="Wireless Radio / Comms">Wireless Radio / Comms</option>
            <option value="Body Camera">Body Camera</option>
            <option value="Protective Gear">Protective Tactical Gear</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
          >
            <option value="">All Statuses</option>
            <option value="Registered">Registered in Armory</option>
            <option value="Assigned">Assigned on Duty</option>
            <option value="In Transit">In Transit</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Lost/Stolen">Lost/Stolen</option>
            <option value="Retired">Retired / Condemned</option>
          </select>
        </div>
      </div>

      {/* Asset Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900 mx-auto mb-2" />
          Loading police asset register...
        </div>
      ) : assets.length === 0 ? (
        <div className="gov-card p-12 text-center space-y-3 rounded-2xl">
          <PackageCheck className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">No Police Assets Registered</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No equipment records matched the search filters. Register new firearms, vehicles, or forensic tools above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="gov-card p-5 flex flex-col justify-between space-y-3 group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    {asset.assetNumber}
                  </span>
                  <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                    asset.status === 'Assigned' ? 'status-pill-blue' : 
                    asset.status === 'Under Maintenance' ? 'status-pill-amber' : 
                    'status-pill-emerald'
                  }`}>
                    {asset.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors">{asset.name}</h3>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">S/N: {asset.serialNumber}</p>
                <p className="text-xs text-slate-600 mt-2">
                  Type: <strong className="text-slate-800">{asset.type}</strong> • Condition: <span className="text-emerald-700 font-semibold">{asset.condition}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                <p>Current Custodian: <strong className="text-slate-900">{asset.currentCustodianName || 'Central Armory'}</strong></p>
                <p>Location: <span className="text-slate-700">{asset.location}</span></p>

                {canManageAssets && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedAsset(asset);
                        setNewStatus(asset.status);
                        setIsUpdateModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1 transition-all"
                    >
                      <Wrench className="w-3.5 h-3.5 text-blue-600" />
                      <span>Update Lifecycle State</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Register Asset Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Official Police Asset & Equipment Ingestion"
        subtitle="Department Armory & Material Lifecycle Register"
      >
        <form onSubmit={handleRegisterAsset} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Model / Nomenclature *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Glock 17 9mm Gen 5 Service Firearm"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Asset Category *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              >
                <option value="Firearm">Service Firearm</option>
                <option value="Vehicle">Patrol Vehicle</option>
                <option value="Forensic Equipment">Forensic Equipment</option>
                <option value="Wireless Radio / Comms">Wireless Radio</option>
                <option value="Body Camera">Body Camera</option>
                <option value="Protective Gear">Protective Gear</option>
                <option value="Drone / Surveillance">Drone / Surveillance</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Serial Number / Asset Tag *</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                required
                placeholder="e.g. GLK-17-DEL-99210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Armory Locker *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Condition Status</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              >
                <option value="Excellent">Excellent</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Requires Repair">Requires Repair</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold disabled:opacity-50 transition-all shadow-sm"
            >
              {isSubmitting ? 'Registering...' : 'Register Official Asset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Asset State Modal */}
      <Modal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        title={`Update Lifecycle State: ${selectedAsset?.assetNumber}`}
        subtitle="Records assignment, maintenance log, or status changes in asset ledger"
      >
        <form onSubmit={handleUpdateStatus} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Status *</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              >
                <option value="Assigned">Assigned on Duty</option>
                <option value="In Transit">In Transit</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Lost/Stolen">Lost/Stolen</option>
                <option value="Retired">Retired / Condemned</option>
                <option value="Registered">Registered in Storage</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lifecycle Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
              >
                <option value="ASSIGNMENT">DUTY ASSIGNMENT</option>
                <option value="MAINTENANCE_LOG">MAINTENANCE LOG</option>
                <option value="RETURN">RETURN TO ARMORY</option>
                <option value="INSPECTION">PERIODIC INSPECTION</option>
                <option value="STATUS_CHANGE">STATUS CHANGE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Custodian Officer / Unit</label>
            <input
              type="text"
              value={toCustodian}
              onChange={(e) => setToCustodian(e.target.value)}
              placeholder="e.g. Inspector Rajesh Verma or Crime Branch Armory"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Official Event Remarks *</label>
            <textarea
              rows={3}
              value={statusDetails}
              onChange={(e) => setStatusDetails(e.target.value)}
              required
              placeholder="e.g. Issued for field duty investigation in Cyber Crime FIR-2026-CRB-101..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-900 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold disabled:opacity-50 transition-all shadow-sm"
            >
              {isUpdating ? 'Recording...' : 'Log Official Event'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
