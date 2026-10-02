import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  ShieldAlert, 
  Fingerprint, 
  Eye, 
  Dna, 
  MapPin, 
  UserCheck, 
  Building2, 
  RefreshCw, 
  Activity, 
  Flame, 
  Target, 
  BarChart3, 
  Layers, 
  ArrowUpRight, 
  Compass,
  FileText,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';
import { PersonRecord } from '../types.js';
import { apiGet, apiPost } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';

interface PersonRecordsProps {
  onSelectCase?: (caseId: string) => void;
  onNavigateTab?: (tab: string, extraId?: string) => void;
}

export const PersonRecords: React.FC<PersonRecordsProps> = ({ onSelectCase, onNavigateTab }) => {
  const { user } = useAuth();
  const [persons, setPersons] = useState<PersonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation View Tab: 'locality_checker' | 'master_dossiers'
  const [activeViewTab, setActiveViewTab] = useState<'locality_checker' | 'master_dossiers'>('locality_checker');

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState('Hauz Khas PS');
  const [selectedCrimeCategory, setSelectedCrimeCategory] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('');
  const [afisFilter, setAfisFilter] = useState('');
  
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLinkCaseModalOpen, setIsLinkCaseModalOpen] = useState(false);

  // Form states for creating person
  const [newName, setNewName] = useState('');
  const [newAliases, setNewAliases] = useState('');
  const [newFather, setNewFather] = useState('');
  const [newGender, setNewGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [newAge, setNewAge] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStation, setNewStation] = useState('Hauz Khas PS');
  const [newDistrict, setNewDistrict] = useState('South District');
  const [newAddress, setNewAddress] = useState('');
  const [newMarks, setNewMarks] = useState('');
  const [newRisk, setNewRisk] = useState<'Low' | 'Moderate' | 'High' | 'Critical'>('Moderate');
  const [newPrimaryCrime, setNewPrimaryCrime] = useState('Snatching & Robbery');
  const [newModusOperandi, setNewModusOperandi] = useState('');
  const [newSyndicate, setNewSyndicate] = useState('');
  const [newAfisStatus, setNewAfisStatus] = useState<'VERIFIED' | 'PENDING' | 'NOT_ENROLLED'>('VERIFIED');
  const [newIris, setNewIris] = useState(true);
  const [newDna, setNewDna] = useState('');

  // Link case form
  const [linkCaseId, setLinkCaseId] = useState('');
  const [linkCaseNumber, setLinkCaseNumber] = useState('');
  const [linkRole, setLinkRole] = useState<'Accused' | 'Suspect' | 'Witness' | 'Victim' | 'Informant'>('Accused');
  const [linkCharges, setLinkCharges] = useState('');

  const fetchPersons = async () => {
    setLoading(true);
    try {
      const data = await apiGet<PersonRecord[]>('/api/persons');
      setPersons(data || []);
    } catch (err) {
      console.error('Failed to load person records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersons();
  }, []);

  // Distinct Police Stations list
  const policeStationsList = [
    'Hauz Khas PS',
    'Lajpat Nagar PS',
    'Rohini North PS',
    'Dwarka Sector 23 Cyber PS',
    'Karol Bagh PS',
    'Connaught Place PS',
    'Kalyanpuri PS',
    'Seemapuri PS',
    'Vasant Kunj PS',
    'Vasant Vihar PS'
  ];

  // Distinct Crime Categories
  const crimeCategoriesList = [
    'ALL',
    'Snatching & Robbery',
    'Vehicle Theft / Auto-Lifting',
    'Armed Robbery & Extortion',
    'Assault & Grievous Hurt',
    'Cyber Fraud & Phishing',
    'Narcotics & NDPS',
    'Burglary & House-Breaking'
  ];

  // Filtered persons in selected station for Locality Checker
  const stationPersons = persons.filter(p => {
    const matchStation = selectedStation === 'ALL' || p.policeStation.toLowerCase() === selectedStation.toLowerCase();
    const matchCrime = selectedCrimeCategory === 'ALL' || (p.primaryCrimeType && p.primaryCrimeType.toLowerCase().includes(selectedCrimeCategory.toLowerCase()));
    return matchStation && matchCrime;
  });

  // Calculate station crime category statistics
  const stationCrimeStats = React.useMemo(() => {
    const inStation = persons.filter(p => selectedStation === 'ALL' || p.policeStation.toLowerCase() === selectedStation.toLowerCase());
    const counts: Record<string, number> = {};
    inStation.forEach(p => {
      const crime = p.primaryCrimeType || 'General / Other Offence';
      counts[crime] = (counts[crime] || 0) + 1;
    });

    const total = inStation.length || 1;
    return Object.entries(counts)
      .map(([crime, count]) => ({
        crime,
        count,
        percentage: Math.round((count / total) * 100)
      }))
      .sort((a, b) => b.count - a.count);
  }, [persons, selectedStation]);

  // Master dossiers filtered list
  const masterFilteredPersons = persons.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || (
      p.fullName.toLowerCase().includes(q) ||
      p.cpid.toLowerCase().includes(q) ||
      p.aliases.some(a => a.toLowerCase().includes(q)) ||
      (p.primaryPhone && p.primaryPhone.includes(q)) ||
      (p.primaryCrimeType && p.primaryCrimeType.toLowerCase().includes(q)) ||
      (p.modusOperandi && p.modusOperandi.toLowerCase().includes(q)) ||
      p.linkedCases.some(lc => lc.caseNumber.toLowerCase().includes(q))
    );

    const matchRisk = !riskFilter || p.riskRating === riskFilter;
    const matchAfis = !afisFilter || p.biometrics.afisStatus === afisFilter;

    return matchQuery && matchRisk && matchAfis;
  });

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newStation) return;

    try {
      const payload = {
        fullName: newName,
        aliases: newAliases.split(',').map(a => a.trim()).filter(Boolean),
        fatherOrSpouseName: newFather,
        gender: newGender,
        dobOrAge: newAge || '30 Yrs',
        primaryPhone: newPhone,
        address: newAddress,
        policeStation: newStation,
        district: newDistrict,
        state: 'Delhi',
        pincode: '110016',
        riskRating: newRisk,
        primaryCrimeType: newPrimaryCrime,
        modusOperandi: newModusOperandi,
        gangOrSyndicateAffiliation: newSyndicate || undefined,
        identificationMarks: newMarks.split(',').map(m => m.trim()).filter(Boolean),
        biometrics: {
          afisStatus: newAfisStatus,
          irisEnrolled: newIris,
          dnaReferenceId: newDna || undefined
        },
        previousConvictionsCount: 1,
        isVerifiedProfile: true
      };

      await apiPost('/api/persons', payload);
      setIsCreateModalOpen(false);
      resetCreateForm();
      fetchPersons();
    } catch (err) {
      console.error('Failed to create person record:', err);
    }
  };

  const handleLinkCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !linkCaseNumber) return;

    try {
      await apiPost(`/api/persons/${selectedPerson.id}/link-case`, {
        caseId: linkCaseId || linkCaseNumber,
        caseNumber: linkCaseNumber,
        role: linkRole,
        sectionCharges: linkCharges,
        status: 'Active Investigation'
      });
      setIsLinkCaseModalOpen(false);
      fetchPersons();
      const updated = await apiGet<PersonRecord>(`/api/persons/${selectedPerson.id}`);
      setSelectedPerson(updated);
    } catch (err) {
      console.error('Failed to link case:', err);
    }
  };

  const resetCreateForm = () => {
    setNewName('');
    setNewAliases('');
    setNewFather('');
    setNewAge('');
    setNewPhone('');
    setNewAddress('');
    setNewMarks('');
    setNewModusOperandi('');
    setNewSyndicate('');
    setNewDna('');
  };

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case 'Critical':
        return 'status-pill-crimson';
      case 'High':
        return 'status-pill-amber';
      case 'Moderate':
        return 'status-pill-blue';
      default:
        return 'status-pill-emerald';
    }
  };

  const getAfisBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
            <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
            AFIS MATCHED
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">
            <Fingerprint className="w-3.5 h-3.5 text-amber-600" />
            AFIS PENDING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-medium">
            NOT ENROLLED
          </span>
        );
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-200">
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Criminal Records & Locality Crime Checker
            </h1>
            <span className="status-pill-amber text-[10px]">
              CPID REGISTRY
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Internal Person IDs (CPID), Police Station crime pattern analysis, repeat offender tracking, and inter-case linkages
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={fetchPersons}
            className="px-3.5 py-2 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            title="Refresh database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync ({persons.length} Dossiers)</span>
          </button>

          {user && ['investigating_officer', 'supervisor', 'admin', 'forensic_officer'].includes(user.role) && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" />
              <span>Register Criminal / CPID</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Mode Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1">
        <button
          onClick={() => setActiveViewTab('locality_checker')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeViewTab === 'locality_checker'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Compass className="w-4 h-4 text-amber-400" />
          <span>Locality-Based Criminal Checker & PS Crime Analyzer</span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-bold">
            PS Mode
          </span>
        </button>

        <button
          onClick={() => setActiveViewTab('master_dossiers')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            activeViewTab === 'master_dossiers'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span>All Master Criminal Dossiers & CPID Registry ({persons.length})</span>
        </button>
      </div>

      {/* VIEW 1: LOCALITY-BASED CRIMINAL CHECKER & PS CRIME DOMINANCE ANALYZER */}
      {activeViewTab === 'locality_checker' && (
        <div className="space-y-6">
          {/* PS Station Selector Bar */}
          <div className="gov-card p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Jurisdiction / Police Station
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    Jurisdiction Crime Dominance & Perpetrator Matrix
                  </div>
                </div>
              </div>

              {/* Station Dropdown Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-700">Active PS:</label>
                <select
                  value={selectedStation}
                  onChange={(e) => setSelectedStation(e.target.value)}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 shadow-xs transition-all"
                >
                  <option value="ALL">All Delhi Police Jurisdictions</option>
                  {policeStationsList.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Crime Breakdown Metric Cards for Selected PS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-3 border-t border-slate-100">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="text-[10px] font-semibold text-slate-400">Station Active Criminals</div>
                <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                  {persons.filter(p => selectedStation === 'ALL' || p.policeStation.toLowerCase() === selectedStation.toLowerCase()).length}
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                  Assigned to {selectedStation}
                </div>
              </div>

              <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-200/80">
                <div className="text-[10px] font-semibold text-rose-700 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                  <span>Dominant Crime Category</span>
                </div>
                <div className="text-sm font-bold text-rose-900 mt-1 truncate">
                  {stationCrimeStats[0]?.crime || 'Snatching & Robbery'}
                </div>
                <div className="text-[10px] text-rose-700 font-medium mt-0.5">
                  {stationCrimeStats[0]?.count || 0} Criminals ({stationCrimeStats[0]?.percentage || 0}% of PS Total)
                </div>
              </div>

              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80">
                <div className="text-[10px] font-semibold text-amber-700 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Critical Risk Perpetrators</span>
                </div>
                <div className="text-2xl font-black text-amber-900 mt-1 font-mono">
                  {persons.filter(p => (selectedStation === 'ALL' || p.policeStation.toLowerCase() === selectedStation.toLowerCase()) && p.riskRating === 'Critical').length}
                </div>
                <div className="text-[10px] text-amber-700 font-medium mt-0.5">
                  Active Surveillance Watchlist
                </div>
              </div>

              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-200/80">
                <div className="text-[10px] font-semibold text-blue-700 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-blue-600" />
                  <span>Cross-FIR Linked Networks</span>
                </div>
                <div className="text-2xl font-black text-blue-900 mt-1 font-mono">
                  {persons.filter(p => (selectedStation === 'ALL' || p.policeStation.toLowerCase() === selectedStation.toLowerCase()) && p.linkedCases.length > 1).length}
                </div>
                <div className="text-[10px] text-blue-700 font-medium mt-0.5">
                  Multi-Docket Serial Offenders
                </div>
              </div>
            </div>

            {/* Station Crime Breakdown Bars */}
            <div className="pt-2">
              <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-slate-500" />
                <span>Crime Category Breakdown in {selectedStation}:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {stationCrimeStats.map((stat, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-900 truncate">{stat.crime}</span>
                      <span className="font-bold text-slate-700 font-mono ml-2 shrink-0">{stat.count} ({stat.percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          stat.crime.includes('Snatching') ? 'bg-rose-500' :
                          stat.crime.includes('Vehicle') ? 'bg-indigo-500' :
                          stat.crime.includes('Armed') ? 'bg-amber-500' :
                          stat.crime.includes('Assault') ? 'bg-orange-500' :
                          stat.crime.includes('Cyber') ? 'bg-blue-500' :
                          stat.crime.includes('Narcotics') ? 'bg-purple-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${stat.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Crime Filter Pills */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Filter by Crime:
              </span>
              {crimeCategoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCrimeCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    selectedCrimeCategory === cat
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* List of Criminals in this Station matching selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-rose-600" />
                <span>Active Criminals in {selectedStation} ({stationPersons.length} Records)</span>
              </h2>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('intelligence')}
                  className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
                >
                  <span>View Cross-Document Intelligence Graph</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {stationPersons.length === 0 ? (
              <div className="gov-card p-12 text-center rounded-2xl">
                <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-900">No criminal records found for selected filters</h3>
                <p className="text-xs text-slate-500 mt-1">Try selecting 'All Delhi Police Jurisdictions' or another crime category.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stationPersons.map(person => (
                  <div
                    key={person.id}
                    onClick={() => setSelectedPerson(person)}
                    className="gov-card p-5 cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="space-y-3">
                      {/* Top Bar: CPID + Risk Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                          {person.cpid}
                        </span>
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${getRiskBadgeClass(person.riskRating)}`}>
                          {person.riskRating.toUpperCase()} RISK
                        </span>
                      </div>

                      {/* Photo & Identity */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-slate-800 font-bold text-sm">
                          {person.biometrics.mugshotUrl ? (
                            <img src={person.biometrics.mugshotUrl} alt={person.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-700">
                              <Fingerprint className="w-4 h-4 text-slate-400 mb-0.5" />
                              <span className="text-[10px] font-mono font-bold tracking-tight">{person.fullName.slice(0, 2).toUpperCase()}</span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {person.fullName}
                          </h3>
                          {person.aliases.length > 0 && (
                            <div className="text-[11px] text-amber-700 font-semibold truncate">
                              Alias: {person.aliases.join(', ')}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                            {person.gender} • {person.dobOrAge} • Prior: <strong className="text-slate-800">{person.previousConvictionsCount}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Primary Crime & Modus Operandi Box */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Primary Crime</span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                            {person.primaryCrimeType || 'General Offence'}
                          </span>
                        </div>
                        {person.modusOperandi && (
                          <p className="text-[11px] text-slate-700 line-clamp-2 italic">
                            "{person.modusOperandi}"
                          </p>
                        )}
                      </div>

                      {/* Biometrics & PS info */}
                      <div className="flex items-center justify-between pt-1 text-[11px]">
                        {getAfisBadge(person.biometrics.afisStatus)}
                        <span className="text-slate-600 font-medium flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate max-w-[130px]">{person.policeStation}</span>
                        </span>
                      </div>

                      {/* Linked Dockets */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Linked FIR Dockets ({person.linkedCases.length})
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {person.linkedCases.map((lc, i) => (
                            <span
                              key={i}
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold ${
                                lc.role === 'Accused' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                lc.role === 'Suspect' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                lc.role === 'Victim' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {lc.caseNumber} ({lc.role})
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
                      <span>Open Verified Dossier</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: MASTER CRIMINAL DOSSIERS & CPID REGISTRY */}
      {activeViewTab === 'master_dossiers' && (
        <div className="space-y-5">
          {/* Multi-Facet Search & Filter Bar */}
          <div className="gov-card p-4 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Name, CPID (e.g. CPID-DL-2024-88412), Aliases, Phone, Modus Operandi, or FIR No..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400 transition-all font-sans"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                >
                  <option value="">All Risk Ratings</option>
                  <option value="Critical">Critical Risk</option>
                  <option value="High">High Risk</option>
                  <option value="Moderate">Moderate Risk</option>
                  <option value="Low">Low Risk</option>
                </select>

                <select
                  value={afisFilter}
                  onChange={(e) => setAfisFilter(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                >
                  <option value="">All AFIS Status</option>
                  <option value="VERIFIED">AFIS Matched</option>
                  <option value="PENDING">AFIS Pending</option>
                  <option value="NOT_ENROLLED">Not Enrolled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Master Dossiers Grid */}
          {loading ? (
            <div className="py-12 flex justify-center items-center text-slate-500 text-xs font-semibold">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-slate-900" />
              <span>Querying National Criminal Intelligence Grid...</span>
            </div>
          ) : masterFilteredPersons.length === 0 ? (
            <div className="gov-card p-12 text-center rounded-2xl">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-900">No person dossiers matching search criteria</h3>
              <p className="text-xs text-slate-500 mt-1">Try clearing search term or register a new record.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {masterFilteredPersons.map(person => (
                <div
                  key={person.id}
                  onClick={() => setSelectedPerson(person)}
                  className="gov-card p-5 cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                        {person.cpid}
                      </span>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${getRiskBadgeClass(person.riskRating)}`}>
                        {person.riskRating.toUpperCase()} RISK
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-slate-800 font-bold text-sm">
                        {person.biometrics.mugshotUrl ? (
                          <img src={person.biometrics.mugshotUrl} alt={person.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-700">
                            <Fingerprint className="w-4 h-4 text-slate-400 mb-0.5" />
                            <span className="text-[10px] font-mono font-bold tracking-tight">{person.fullName.slice(0, 2).toUpperCase()}</span>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                          {person.fullName}
                        </h3>
                        {person.aliases.length > 0 && (
                          <div className="text-[11px] text-amber-700 font-semibold truncate">
                            Alias: {person.aliases.join(', ')}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {person.gender} • {person.dobOrAge} • S/o {person.fatherOrSpouseName}
                        </div>
                      </div>
                    </div>

                    {/* Biometrics & Locality Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {getAfisBadge(person.biometrics.afisStatus)}
                      {person.biometrics.irisEnrolled && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                          <Eye className="w-2.5 h-2.5" /> IRIS
                        </span>
                      )}
                      {person.biometrics.dnaReferenceId && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                          <Dna className="w-2.5 h-2.5" /> DNA
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-700 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{person.policeStation}, {person.district}</span>
                    </div>

                    {/* Linked Cases */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Linked FIR Dockets ({person.linkedCases.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {person.linkedCases.map((lc, i) => (
                          <span
                            key={i}
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold ${
                              lc.role === 'Accused' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              lc.role === 'Suspect' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              lc.role === 'Victim' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {lc.caseNumber} ({lc.role})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
                    <span>View Dossier Details</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAILED PERSON DOSSIER MODAL */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 p-6 text-white relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold bg-slate-800 px-2.5 py-1 rounded-full text-slate-200 border border-slate-700">
                  {selectedPerson.cpid}
                </span>
                <button
                  onClick={() => setSelectedPerson(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start gap-4 mt-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                  {selectedPerson.biometrics.mugshotUrl ? (
                    <img src={selectedPerson.biometrics.mugshotUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Fingerprint className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-[9px] font-mono text-slate-300 font-semibold tracking-wider">AFIS RECORD</span>
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedPerson.fullName}</h2>
                  {selectedPerson.aliases.length > 0 && (
                    <p className="text-xs text-amber-400 font-semibold mt-0.5">
                      Known Aliases: {selectedPerson.aliases.join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-slate-300 mt-1">
                    {selectedPerson.gender} • {selectedPerson.dobOrAge} • S/o {selectedPerson.fatherOrSpouseName}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
              {/* Risk & Verification Seal */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Risk Rating</span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full inline-block mt-0.5 ${getRiskBadgeClass(selectedPerson.riskRating)}`}>
                    {selectedPerson.riskRating} Risk Category
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block">Profile Verification</span>
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 mt-0.5 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Verified by {selectedPerson.verificationAuthority || 'NCRB Hub'}
                  </span>
                </div>
              </div>

              {/* Crime Type & Modus Operandi */}
              <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200/80 space-y-1.5">
                <div className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                  Primary Crime Classification & Modus Operandi
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  {selectedPerson.primaryCrimeType || 'General IPC / BNS Offences'}
                </div>
                {selectedPerson.modusOperandi && (
                  <div className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-purple-200/60">
                    <strong className="text-purple-950 font-semibold">Modus Operandi: </strong>
                    {selectedPerson.modusOperandi}
                  </div>
                )}
              </div>

              {/* Biometrics Metadata */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-blue-600" />
                  Biometric & Forensics Metadata
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-medium">AFIS Status</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">{selectedPerson.biometrics.afisStatus}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-medium">Iris Biometrics</div>
                    <div className="text-xs font-bold text-slate-900 mt-0.5">
                      {selectedPerson.biometrics.irisEnrolled ? 'Enrolled & Verified' : 'Not Available'}
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="text-[10px] text-slate-400 font-medium">DNA Reference ID</div>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                      {selectedPerson.biometrics.dnaReferenceId || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Identification Marks */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1.5">
                  Physical Identification Marks
                </h4>
                {selectedPerson.identificationMarks.length > 0 ? (
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                    {selectedPerson.identificationMarks.map((mark, i) => (
                      <li key={i}>{mark}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs text-slate-400 italic">No distinctive physical marks registered.</div>
                )}
              </div>

              {/* Jurisdiction & Contact Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Police Station & District</div>
                  <div className="font-bold text-slate-900">{selectedPerson.policeStation}</div>
                  <div className="text-slate-600">{selectedPerson.address}</div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
                  <div className="text-[10px] text-slate-400 font-medium uppercase">Syndicate & Prior Convictions</div>
                  <div className="font-bold text-slate-900">{selectedPerson.gangOrSyndicateAffiliation || 'Independent / None'}</div>
                  <div className="text-slate-600">Prior Convictions: <strong className="text-slate-900">{selectedPerson.previousConvictionsCount}</strong></div>
                </div>
              </div>

              {/* Linked Case Dockets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Linked Investigation Dockets ({selectedPerson.linkedCases.length})
                  </h4>
                  {user && ['investigating_officer', 'supervisor', 'admin'].includes(user.role) && (
                    <button
                      onClick={() => setIsLinkCaseModalOpen(true)}
                      className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Link to Another FIR</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {selectedPerson.linkedCases.map((lc, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50 flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-700">{lc.caseNumber}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                            lc.role === 'Accused' ? 'status-pill-crimson' :
                            lc.role === 'Suspect' ? 'status-pill-amber' :
                            lc.role === 'Victim' ? 'status-pill-emerald' :
                            'status-pill-blue'
                          }`}>
                            {lc.role}
                          </span>
                        </div>
                        {lc.sectionCharges && (
                          <div className="text-[11px] text-slate-600 font-medium mt-0.5">
                            Charges: {lc.sectionCharges}
                          </div>
                        )}
                      </div>

                      {onSelectCase && (
                        <button
                          onClick={() => {
                            setSelectedPerson(null);
                            onSelectCase(lc.caseId);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1 shadow-xs transition-all"
                        >
                          <span>Open FIR</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              {onNavigateTab && (
                <button
                  onClick={() => {
                    setSelectedPerson(null);
                    onNavigateTab('intelligence');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Compass className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cross-Case Intelligence Graph</span>
                </button>
              )}
              <button
                onClick={() => setSelectedPerson(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold transition-all"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER NEW PERSON MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Register Criminal / CPID Dossier</h3>
                <p className="text-xs text-slate-400">National Crime Records Bureau standard format</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white w-8 h-8 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Rahul Verma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Aliases (comma separated)</label>
                  <input
                    type="text"
                    value={newAliases}
                    onChange={(e) => setNewAliases(e.target.value)}
                    placeholder="e.g. Kala, Pulsar Snatcher"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Father / Spouse Name</label>
                  <input
                    type="text"
                    value={newFather}
                    onChange={(e) => setNewFather(e.target.value)}
                    placeholder="e.g. Ramu Verma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Gender</label>
                  <select
                    value={newGender}
                    onChange={(e) => setNewGender(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Age / DOB</label>
                  <input
                    type="text"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    placeholder="e.g. 26 Yrs"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Primary Crime Category *</label>
                  <select
                    value={newPrimaryCrime}
                    onChange={(e) => setNewPrimaryCrime(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                  >
                    <option value="Snatching & Robbery">Snatching & Robbery</option>
                    <option value="Vehicle Theft / Auto-Lifting">Vehicle Theft / Auto-Lifting</option>
                    <option value="Armed Robbery & Extortion">Armed Robbery & Extortion</option>
                    <option value="Assault & Grievous Hurt">Assault & Grievous Hurt</option>
                    <option value="Cyber Fraud & Phishing">Cyber Fraud & Phishing</option>
                    <option value="Narcotics & NDPS">Narcotics & NDPS</option>
                    <option value="Burglary & House-Breaking">Burglary & House-Breaking</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Police Station *</label>
                  <select
                    value={newStation}
                    onChange={(e) => setNewStation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                  >
                    {policeStationsList.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Modus Operandi (MO)</label>
                <textarea
                  value={newModusOperandi}
                  onChange={(e) => setNewModusOperandi(e.target.value)}
                  placeholder="e.g. Pillion rider gold chain and iPhone snatching on black Pulsar 220 motorcycle near Hauz Khas market and Green Park metro."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Residential Address / Locality</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. Gali No. 4, Begumpur Village, Hauz Khas, New Delhi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Risk Classification</label>
                  <select
                    value={newRisk}
                    onChange={(e) => setNewRisk(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                  >
                    <option value="Critical">Critical Risk</option>
                    <option value="High">High Risk</option>
                    <option value="Moderate">Moderate Risk</option>
                    <option value="Low">Low Risk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">AFIS Biometric Status</label>
                  <select
                    value={newAfisStatus}
                    onChange={(e) => setNewAfisStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                  >
                    <option value="VERIFIED">AFIS Verified</option>
                    <option value="PENDING">AFIS Pending</option>
                    <option value="NOT_ENROLLED">Not Enrolled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Physical Identification Marks</label>
                <input
                  type="text"
                  value={newMarks}
                  onChange={(e) => setNewMarks(e.target.value)}
                  placeholder="e.g. Scar on left eyebrow, scorpion tattoo on right forearm"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                />
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-semibold shadow-sm transition-all"
                >
                  Register Dossier & Generate CPID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINK CASE MODAL */}
      {isLinkCaseModalOpen && selectedPerson && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900">
              Link FIR Docket to {selectedPerson.fullName} ({selectedPerson.cpid})
            </h3>

            <form onSubmit={handleLinkCase} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">FIR / Docket Number *</label>
                <input
                  type="text"
                  required
                  value={linkCaseNumber}
                  onChange={(e) => setLinkCaseNumber(e.target.value)}
                  placeholder="e.g. FIR-2026-CR-104"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Role in Case</label>
                <select
                  value={linkRole}
                  onChange={(e) => setLinkRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                >
                  <option value="Accused">Accused</option>
                  <option value="Suspect">Suspect</option>
                  <option value="Witness">Witness</option>
                  <option value="Victim">Victim</option>
                  <option value="Informant">Informant</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Statutory Charges / Sections</label>
                <input
                  type="text"
                  value={linkCharges}
                  onChange={(e) => setLinkCharges(e.target.value)}
                  placeholder="e.g. BNS Section 304(1) / IPC 379"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/80 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:outline-none transition-all"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLinkCaseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-semibold shadow-xs transition-all"
                >
                  Confirm Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
