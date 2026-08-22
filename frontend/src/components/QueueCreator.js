import React, { useState } from 'react';
import { queueAPI, queueSettingsAPI } from '../services/api';
import QRCodeDisplay from './QRCodeDisplay';

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-start justify-between py-3">
    <div className="flex-1 mr-4">
      <div className="text-sm font-medium text-gray-900">{label}</div>
      {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
    </div>
    <button onClick={() => onChange(!checked)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? 'bg-gray-900' : 'bg-gray-300'}`}>
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  </div>
);

const QueueCreator = ({ onQueueCreated, onSelectQueue }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ name: '', date: new Date().toISOString().split('T')[0], capacity: 100 });
  const [subQueues, setSubQueues] = useState([]);
  const [newSubQueue, setNewSubQueue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdQueue, setCreatedQueue] = useState(null);
  const [settings, setSettings] = useState({
    eligibility_enabled: false, documents_required: false, entry_limit_enabled: false, entry_limit: 100,
    schedule_enabled: false, opens_at: '', closes_at: '', custom_fields_enabled: false, skip_max_distance: 10,
    welcome_message: '', error_message: '',
  });
  const [customFields, setCustomFields] = useState([]);
  const [newField, setNewField] = useState({ field_name: '', field_type: 'text', required: false, field_options: '' });
  const [eligibilityFile, setEligibilityFile] = useState(null);
  const [docRequirements, setDocRequirements] = useState([]);
  const [newDoc, setNewDoc] = useState({ name: '', description: '', mandatory: true, accepted_types: 'JPG,PNG,PDF', verification_mode: 'upload_only' });
  const [expandedSection, setExpandedSection] = useState(null);

  const handleAddSubQueue = () => { if (newSubQueue.trim()) { setSubQueues([...subQueues, { name: newSubQueue.trim(), description: '' }]); setNewSubQueue(''); } };
  const handleRemoveSubQueue = (i) => setSubQueues(subQueues.filter((_, idx) => idx !== i));

  const handleAddField = () => {
    if (!newField.field_name.trim()) return;
    const f = { ...newField };
    if (f.field_type === 'dropdown' && f.field_options) f.field_options = f.field_options.split(',').map(o => o.trim()).filter(Boolean);
    else delete f.field_options;
    setCustomFields([...customFields, f]);
    setNewField({ field_name: '', field_type: 'text', required: false, field_options: '' });
  };
  const handleRemoveField = (i) => setCustomFields(customFields.filter((_, idx) => idx !== i));

  const handleAddDoc = () => {
    if (!newDoc.name.trim()) return;
    setDocRequirements([...docRequirements, { ...newDoc }]);
    setNewDoc({ name: '', description: '', mandatory: true, accepted_types: 'JPG,PNG,PDF', verification_mode: 'upload_only' });
  };
  const handleRemoveDoc = (i) => setDocRequirements(docRequirements.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setLoading(true); setError('');
    try {
      const hasSettings = settings.eligibility_enabled || settings.documents_required || settings.entry_limit_enabled || settings.schedule_enabled || settings.custom_fields_enabled;
      const response = await queueAPI.create({ name: formData.name, date: formData.date, capacity: formData.capacity, subQueues, settings: hasSettings ? settings : undefined, customFields: customFields.length > 0 ? customFields : undefined });
      const queue = response.data.queue;
      if (eligibilityFile && settings.eligibility_enabled) { const fd = new FormData(); fd.append('file', eligibilityFile); await queueSettingsAPI.uploadEligibility(queue.id, fd); }
      for (const doc of docRequirements) { const fd = new FormData(); fd.append('name', doc.name); fd.append('description', doc.description); fd.append('mandatory', doc.mandatory); fd.append('accepted_types', doc.accepted_types); fd.append('verification_mode', doc.verification_mode); await queueSettingsAPI.addDocRequirement(queue.id, fd); }
      setCreatedQueue(queue); onQueueCreated(queue); setStep(4);
    } catch (err) { setError(err.response?.data?.error || 'Failed to create queue'); } finally { setLoading(false); }
  };

  const resetAll = () => { setStep(1); setCreatedQueue(null); setSettings({ eligibility_enabled: false, documents_required: false, entry_limit_enabled: false, entry_limit: 100, schedule_enabled: false, opens_at: '', closes_at: '', custom_fields_enabled: false, skip_max_distance: 10, welcome_message: '', error_message: '' }); setCustomFields([]); setDocRequirements([]); setEligibilityFile(null); setSubQueues([]); setFormData({ name: '', date: new Date().toISOString().split('T')[0], capacity: 100 }); };

  if (step === 4 && createdQueue) return <QRCodeDisplay queue={createdQueue} onComplete={resetAll} onGoToAdmin={() => onSelectQueue(createdQueue)} />;

  const toggle = (s) => setExpandedSection(expandedSection === s ? null : s);
  const updateSetting = (key, val) => setSettings({ ...settings, [key]: val });

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Create Queue</h2>
        <div className="text-xs text-gray-500 mb-6">{step === 3 ? 'Step 3 of 3 (Optional)' : `Step ${step} of 3`}</div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 text-sm">{error}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Queue Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Smart Hospital" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity</label>
                <input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })} min={1} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" /></div>
            </div>
            <button onClick={() => formData.name && setStep(2)} disabled={!formData.name} className="w-full py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">Next: Add Services</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input type="text" value={newSubQueue} onChange={(e) => setNewSubQueue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddSubQueue()} placeholder="Service name (e.g., OPD, Lab)" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
              <button onClick={handleAddSubQueue} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300">Add</button>
            </div>
            {subQueues.length > 0 && <div className="space-y-2">{subQueues.map((sq, i) => (<div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span className="text-sm text-gray-900">{sq.name}</span><button onClick={() => handleRemoveSubQueue(i)} className="text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>))}</div>}
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">Next: Advanced Config</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="text-xs text-gray-500 mb-2">All settings are optional. Queue works normally without them.</div>

            <div className="border border-gray-200 rounded-lg">
              <button onClick={() => { updateSetting('eligibility_enabled', !settings.eligibility_enabled); if (!settings.eligibility_enabled) toggle('eligibility'); }} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <div><div className="text-sm font-medium text-gray-900">Eligibility Check (Approved List)</div><div className="text-xs text-gray-500">Restrict entry to uploaded approved users only</div></div>
                <div className={`w-10 h-6 rounded-full transition-colors ${settings.eligibility_enabled ? 'bg-gray-900' : 'bg-gray-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${settings.eligibility_enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} /></div>
              </button>
              {settings.eligibility_enabled && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  <div className="pt-3"><label className="block text-xs font-medium text-gray-700 mb-1">Upload Approved List (Excel/CSV)</label>
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setEligibilityFile(e.target.files[0])} className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200" />
                    <div className="text-xs text-gray-500 mt-1">Columns: Name, Email, Phone, Student ID</div>
                    {eligibilityFile && <div className="text-xs text-green-600 mt-1">Selected: {eligibilityFile.name}</div>}</div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg">
              <button onClick={() => { updateSetting('documents_required', !settings.documents_required); if (!settings.documents_required) toggle('documents'); }} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <div><div className="text-sm font-medium text-gray-900">Required Documents</div><div className="text-xs text-gray-500">Require document upload before joining</div></div>
                <div className={`w-10 h-6 rounded-full transition-colors ${settings.documents_required ? 'bg-gray-900' : 'bg-gray-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${settings.documents_required ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} /></div>
              </button>
              {settings.documents_required && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  <div className="pt-3 space-y-2">
                    {docRequirements.map((doc, i) => (<div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"><div><span className="font-medium">{doc.name}</span>{doc.mandatory && <span className="ml-2 text-xs text-red-600">Required</span>}</div><button onClick={() => handleRemoveDoc(i)} className="text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>))}
                    <div className="space-y-2 mt-2">
                      <input type="text" value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} placeholder="Document name (e.g., Fee Receipt)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
                      <input type="text" value={newDoc.description} onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })} placeholder="Description / instructions" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
                      <div className="flex gap-2">
                        <select value={newDoc.verification_mode} onChange={(e) => setNewDoc({ ...newDoc, verification_mode: e.target.value })} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900">
                          <option value="upload_only">Upload Only</option><option value="admin_review">Admin Review</option><option value="auto_match">Auto Match (OCR)</option>
                        </select>
                        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={newDoc.mandatory} onChange={(e) => setNewDoc({ ...newDoc, mandatory: e.target.checked })} className="rounded" /> Required</label>
                      </div>
                      <button onClick={handleAddDoc} disabled={!newDoc.name.trim()} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">+ Add Document</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg">
              <button onClick={() => { updateSetting('entry_limit_enabled', !settings.entry_limit_enabled); toggle('limit'); }} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <div><div className="text-sm font-medium text-gray-900">Queue Entry Limit</div><div className="text-xs text-gray-500">Limit total number of users</div></div>
                <div className={`w-10 h-6 rounded-full transition-colors ${settings.entry_limit_enabled ? 'bg-gray-900' : 'bg-gray-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${settings.entry_limit_enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} /></div>
              </button>
              {settings.entry_limit_enabled && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="pt-3"><label className="block text-xs font-medium text-gray-700 mb-1">Maximum Users</label>
                    <input type="number" value={settings.entry_limit} onChange={(e) => updateSetting('entry_limit', parseInt(e.target.value))} min={1} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" /></div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg">
              <button onClick={() => { updateSetting('schedule_enabled', !settings.schedule_enabled); toggle('schedule'); }} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <div><div className="text-sm font-medium text-gray-900">Queue Availability Schedule</div><div className="text-xs text-gray-500">Set opening and closing time</div></div>
                <div className={`w-10 h-6 rounded-full transition-colors ${settings.schedule_enabled ? 'bg-gray-900' : 'bg-gray-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${settings.schedule_enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} /></div>
              </button>
              {settings.schedule_enabled && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  <div className="pt-3 grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Opens At</label><input type="datetime-local" value={settings.opens_at} onChange={(e) => updateSetting('opens_at', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" /></div>
                    <div><label className="block text-xs font-medium text-gray-700 mb-1">Closes At</label><input type="datetime-local" value={settings.closes_at} onChange={(e) => updateSetting('closes_at', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" /></div>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg">
              <button onClick={() => { updateSetting('custom_fields_enabled', !settings.custom_fields_enabled); toggle('custom'); }} className="w-full flex items-center justify-between px-4 py-3 text-left">
                <div><div className="text-sm font-medium text-gray-900">Custom User Information</div><div className="text-xs text-gray-500">Add extra fields to the join form</div></div>
                <div className={`w-10 h-6 rounded-full transition-colors ${settings.custom_fields_enabled ? 'bg-gray-900' : 'bg-gray-300'}`}><div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${settings.custom_fields_enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} /></div>
              </button>
              {settings.custom_fields_enabled && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  <div className="pt-3 space-y-2">
                    {customFields.map((f, i) => (<div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"><div><span className="font-medium">{f.field_name}</span> <span className="text-xs text-gray-500">({f.field_type})</span>{f.required && <span className="ml-2 text-xs text-red-600">Required</span>}</div><button onClick={() => handleRemoveField(i)} className="text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div>))}
                    <div className="space-y-2 mt-2">
                      <input type="text" value={newField.field_name} onChange={(e) => setNewField({ ...newField, field_name: e.target.value })} placeholder="Field name (e.g., Department)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
                      <div className="flex gap-2">
                        <select value={newField.field_type} onChange={(e) => setNewField({ ...newField, field_type: e.target.value })} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900">
                          <option value="text">Text</option><option value="number">Number</option><option value="dropdown">Dropdown</option><option value="date">Date</option><option value="checkbox">Checkbox</option>
                        </select>
                        <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={newField.required} onChange={(e) => setNewField({ ...newField, required: e.target.checked })} className="rounded" /> Required</label>
                      </div>
                      {newField.field_type === 'dropdown' && <input type="text" value={newField.field_options} onChange={(e) => setNewField({ ...newField, field_options: e.target.value })} placeholder="Options (comma-separated)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />}
                      <button onClick={handleAddField} disabled={!newField.field_name.trim()} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">+ Add Field</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg px-4 py-3">
              <div className="text-sm font-medium text-gray-900 mb-2">Skip / Rejoin Rules</div>
              <label className="block text-xs text-gray-700 mb-1">Max skip distance (forward positions)</label>
              <input type="number" value={settings.skip_max_distance} onChange={(e) => updateSetting('skip_max_distance', parseInt(e.target.value))} min={1} max={50} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
            </div>

            <div className="border border-gray-200 rounded-lg px-4 py-3">
              <div className="text-sm font-medium text-gray-900 mb-2">Messages for Users</div>
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Welcome Message (shown when joining)</label>
                  <input type="text" value={settings.welcome_message} onChange={(e) => updateSetting('welcome_message', e.target.value)} placeholder="e.g., Welcome! Please have your documents ready." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Error Message (shown when not eligible)</label>
                  <input type="text" value={settings.error_message} onChange={(e) => updateSetting('error_message', e.target.value)} placeholder="e.g., You are not on the approved list." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900" />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Back</button>
              <button onClick={handleSubmit} disabled={loading} className="flex-1 py-2 px-4 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">{loading ? 'Creating...' : 'Create Queue'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueCreator;
