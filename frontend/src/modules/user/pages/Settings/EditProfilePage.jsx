import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiChevronRight, BiCamera, BiX, BiCopy, BiCheck } from 'react-icons/bi';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import userService from '../../../../services/userService';
import PhotoPickerSheet from '../../components/modals/PhotoPickerSheet';

const EditProfilePage = () => {
    const navigate = useNavigate();
    const { user: currentUser, updateUser } = useAuth();
    const { showToast } = useToast();

    // View state: 'main' | 'name' | 'username' | 'bio'
    const [activeView, setActiveView] = useState('main');

    // Values in state
    const [fullName, setFullName] = useState(currentUser?.fullName || '');
    const [username, setUsername] = useState(currentUser?.username || '');
    const [bio, setBio] = useState(currentUser?.bio || '');

    // Temporary editing values for sub-views
    const [tempName, setTempName] = useState(currentUser?.fullName || '');
    const [tempUsername, setTempUsername] = useState(currentUser?.username || '');
    const [tempBio, setTempBio] = useState(currentUser?.bio || '');

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showPhotoPicker, setShowPhotoPicker] = useState(false);
    const [copied, setCopied] = useState(false);

    // Synchronize with currentUser updates
    useEffect(() => {
        if (currentUser) {
            setFullName(currentUser.fullName || '');
            setUsername(currentUser.username || '');
            setBio(currentUser.bio || '');
        }
    }, [currentUser]);

    // Handle copying profile link
    const handleCopyProfileUrl = (e) => {
        e?.stopPropagation?.();
        const host = window.location.host.includes('localhost') ? 'jhumroo.com' : (window.location.host || 'jhumroo.com');
        const urlToCopy = `https://${host}/@${username || currentUser?.username || 'user'}`;
        navigator.clipboard.writeText(urlToCopy).then(() => {
            setCopied(true);
            showToast('Link copied to clipboard', 'success');
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            showToast('Failed to copy link', 'error');
        });
    };

    // Save Name
    const handleSaveName = async () => {
        const cleanName = tempName.trim();
        if (!cleanName) {
            showToast('Name cannot be empty', 'error');
            return;
        }

        const nameRegex = /^[a-zA-Z.\-']{2,}(?:\s+[a-zA-Z.\-']+)*$/;
        if (!nameRegex.test(cleanName)) {
            showToast('Please enter a valid name (letters and spaces only, min 2 characters)', 'error');
            return;
        }

        setSaving(true);
        try {
            const response = await userService.updateProfile({
                fullName: cleanName
            });
            if (response.success) {
                setFullName(cleanName);
                updateUser(response.user);
                showToast('Name updated successfully!', 'success');
                setActiveView('main');
            }
        } catch (error) {
            console.error('Failed to update name:', error);
            showToast(error?.message || 'Failed to update name', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Save Username
    const handleSaveUsername = async () => {
        const cleanUsername = tempUsername.trim().toLowerCase();
        if (!cleanUsername || cleanUsername.length < 3) {
            showToast('Username must be at least 3 characters', 'error');
            return;
        }

        if (!/^[a-z0-9._]+$/.test(cleanUsername)) {
            showToast('Username can only contain lowercase letters, numbers, dots, and underscores', 'error');
            return;
        }

        setSaving(true);
        try {
            const response = await userService.updateProfile({
                username: cleanUsername
            });
            if (response.success) {
                setUsername(cleanUsername);
                updateUser(response.user);
                showToast('Username updated successfully!', 'success');
                setActiveView('main');
            }
        } catch (error) {
            console.error('Failed to update username:', error);
            showToast(error?.message || 'Failed to update username', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Save Bio
    const handleSaveBio = async () => {
        setSaving(true);
        try {
            const response = await userService.updateProfile({
                bio: tempBio.trim()
            });
            if (response.success) {
                setBio(tempBio.trim());
                updateUser(response.user);
                showToast('Bio updated successfully!', 'success');
                setActiveView('main');
            }
        } catch (error) {
            console.error('Failed to update bio:', error);
            showToast(error?.message || 'Failed to update bio', 'error');
        } finally {
            setSaving(false);
        }
    };

    // Handle Photo Selection
    const handleFileSelected = async (file) => {
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const response = await userService.uploadProfilePicture(formData);
            if (response.success) {
                const updatedUser = {
                    ...currentUser,
                    profilePicture: response.profilePicture,
                };
                updateUser(updatedUser);
                showToast('Profile photo saved successfully!', 'success');
            }
        } catch (error) {
            console.error('Failed to upload profile picture:', error);
            showToast('Profile photo upload failed. Please try again.', 'error');
        } finally {
            setUploading(false);
        }
    };

    // Sub-view: Edit Name
    if (activeView === 'name') {
        const isModified = tempName.trim() !== fullName && tempName.trim().length > 0;
        return (
            <div className="min-h-screen bg-white flex flex-col font-sans">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
                    <button 
                        onClick={() => setActiveView('main')}
                        className="text-[16px] text-black active:opacity-60 font-normal py-1"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveName}
                        disabled={saving || !isModified}
                        className={`text-[16px] font-semibold py-1 transition-colors ${
                            isModified && !saving 
                                ? 'text-[#FE2C55] active:opacity-75 cursor-pointer' 
                                : 'text-[#FE2C55]/40 cursor-not-allowed'
                        }`}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-4 flex-1">
                    <h1 className="text-[22px] font-bold text-black tracking-tight mb-2">Name</h1>
                    <p className="text-[#8a8b91] text-[13.5px] leading-snug mb-4">
                        Your name can only be changed once every 7 days.
                    </p>

                    {/* Input Container */}
                    <div className="bg-[#f1f1f2] rounded-xl px-4 py-3 flex items-center justify-between">
                        <input 
                            type="text"
                            value={tempName}
                            maxLength={30}
                            autoFocus
                            onChange={(e) => setTempName(e.target.value)}
                            placeholder="Name"
                            className="bg-transparent text-black text-[15px] font-medium outline-none w-full caret-[#FE2C55]"
                        />
                        {tempName.length > 0 && (
                            <button 
                                type="button"
                                onClick={() => setTempName('')}
                                className="w-5 h-5 rounded-full bg-[#8a8b91]/70 text-white flex items-center justify-center shrink-0 ml-2 active:scale-90 transition-transform"
                            >
                                <BiX size={15} />
                            </button>
                        )}
                    </div>

                    {/* Character Count */}
                    <p className="text-[#8a8b91] text-[13px] mt-2 text-right font-normal">
                        {tempName.length}/30
                    </p>
                </div>
            </div>
        );
    }

    // Sub-view: Edit Username
    if (activeView === 'username') {
        const isModified = tempUsername.trim().toLowerCase() !== username && tempUsername.trim().length >= 3;
        return (
            <div className="min-h-screen bg-white flex flex-col font-sans">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
                    <button 
                        onClick={() => setActiveView('main')}
                        className="text-[16px] text-black active:opacity-60 font-normal py-1"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveUsername}
                        disabled={saving || !isModified}
                        className={`text-[16px] font-semibold py-1 transition-colors ${
                            isModified && !saving 
                                ? 'text-[#FE2C55] active:opacity-75 cursor-pointer' 
                                : 'text-[#FE2C55]/40 cursor-not-allowed'
                        }`}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-4 flex-1">
                    <h1 className="text-[22px] font-bold text-black tracking-tight mb-2">Username</h1>
                    <p className="text-[#8a8b91] text-[13.5px] leading-snug mb-4">
                        You can change your username once every 30 days.
                    </p>

                    {/* Input Container */}
                    <div className="bg-[#f1f1f2] rounded-xl px-4 py-3 flex items-center justify-between">
                        <input 
                            type="text"
                            value={tempUsername}
                            maxLength={30}
                            autoFocus
                            onChange={(e) => setTempUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                            placeholder="Username"
                            className="bg-transparent text-black text-[15px] font-medium outline-none w-full caret-[#FE2C55]"
                        />
                        {tempUsername.length > 0 && (
                            <button 
                                type="button"
                                onClick={() => setTempUsername('')}
                                className="w-5 h-5 rounded-full bg-[#8a8b91]/70 text-white flex items-center justify-center shrink-0 ml-2 active:scale-90 transition-transform"
                            >
                                <BiX size={15} />
                            </button>
                        )}
                    </div>

                    <p className="text-[#8a8b91] text-[13px] mt-2.5 font-normal">
                        jhumroo.com/@{tempUsername || 'username'}
                    </p>
                    <p className="text-[#8a8b91] text-[12px] mt-1 font-normal">
                        Usernames can only contain letters, numbers, underscores, and periods.
                    </p>

                    {/* Character Count */}
                    <p className="text-[#8a8b91] text-[13px] mt-2 text-right font-normal">
                        {tempUsername.length}/30
                    </p>
                </div>
            </div>
        );
    }

    // Sub-view: Edit Bio
    if (activeView === 'bio') {
        const isModified = tempBio !== bio;
        return (
            <div className="min-h-screen bg-white flex flex-col font-sans">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
                    <button 
                        onClick={() => setActiveView('main')}
                        className="text-[16px] text-black active:opacity-60 font-normal py-1"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSaveBio}
                        disabled={saving || !isModified}
                        className={`text-[16px] font-semibold py-1 transition-colors ${
                            isModified && !saving 
                                ? 'text-[#FE2C55] active:opacity-75 cursor-pointer' 
                                : 'text-[#FE2C55]/40 cursor-not-allowed'
                        }`}
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-4 flex-1">
                    <h1 className="text-[22px] font-bold text-black tracking-tight mb-2">Bio</h1>
                    <p className="text-[#8a8b91] text-[13.5px] leading-snug mb-4">
                        You can edit your bio anytime.
                    </p>

                    {/* Textarea Container */}
                    <div className="bg-[#f1f1f2] rounded-2xl p-4 min-h-[140px]">
                        <textarea 
                            value={tempBio}
                            maxLength={160}
                            autoFocus
                            onChange={(e) => setTempBio(e.target.value)}
                            placeholder="Add a bio to your profile"
                            className="bg-transparent text-black text-[15px] font-normal outline-none w-full resize-none h-28 placeholder-[#8a8b91] caret-[#FE2C55]"
                        />
                    </div>

                    {/* Character Count */}
                    <p className="text-[#8a8b91] text-[13px] mt-2 text-right font-normal">
                        {tempBio.length}/160
                    </p>
                </div>
            </div>
        );
    }


    // Main Edit Profile View
    return (
        <div className="min-h-screen bg-[#f8f8f8] flex flex-col font-sans pb-12 select-none">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 sticky top-0 bg-[#f8f8f8] z-20">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-1 -ml-1 text-black active:opacity-60 transition-opacity"
                    aria-label="Back"
                >
                    <BiChevronLeft size={30} />
                </button>
                <h1 className="text-[17px] font-bold text-black absolute left-0 right-0 text-center pointer-events-none">
                    Edit profile
                </h1>
                <div className="w-8" />
            </div>

            <div className="flex-1 overflow-y-auto">
                {/* Profile Photo Section */}
                <div className="flex flex-col items-center pt-3 pb-6">
                    <div 
                        className="relative cursor-pointer active:scale-95 transition-transform"
                        onClick={() => setShowPhotoPicker(true)}
                    >
                        <div className="w-[96px] h-[96px] rounded-full overflow-hidden bg-gray-200 relative shadow-inner">
                            <img 
                                src={
                                    currentUser?.profilePicture?.url ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'user'}&style=circle`
                                } 
                                alt={username} 
                                className={`w-full h-full object-cover ${uploading ? 'opacity-40' : ''}`} 
                            />
                            {/* Dark Camera Overlay in Center */}
                            <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                <BiCamera size={26} className="text-white" />
                            </div>
                            {/* Upload spinner */}
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Change Photo Teal Link */}
                    <button
                        onClick={() => setShowPhotoPicker(true)}
                        className="text-[#009688] text-[14px] font-semibold mt-2.5 active:opacity-75 transition-opacity"
                    >
                        {uploading ? 'Uploading...' : 'Change photo'}
                    </button>
                </div>

                {/* Section 1: Main Info Card */}
                <div className="px-4">
                    <div className="bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-black/[0.04] overflow-hidden">
                        {/* Name Row */}
                        <div 
                            onClick={() => {
                                setTempName(fullName);
                                setActiveView('name');
                            }}
                            className="flex items-center justify-between px-4 py-4 cursor-pointer active:bg-gray-50/80 transition-colors border-b border-gray-100/80"
                        >
                            <span className="text-[#737373] text-[15px] font-normal">Name</span>
                            <div className="flex items-center gap-1.5 max-w-[65%]">
                                <span className="text-[#161823] text-[15px] font-medium truncate">
                                    {fullName || 'Add name'}
                                </span>
                                <BiChevronRight size={22} className="text-[#c4c4c4] shrink-0" />
                            </div>
                        </div>

                        {/* Username Row */}
                        <div 
                            onClick={() => {
                                setTempUsername(username);
                                setActiveView('username');
                            }}
                            className="flex items-center justify-between px-4 py-4 cursor-pointer active:bg-gray-50/80 transition-colors border-b border-gray-100/80"
                        >
                            <span className="text-[#737373] text-[15px] font-normal">Username</span>
                            <div className="flex items-center gap-1.5 max-w-[65%]">
                                <span className="text-[#161823] text-[15px] font-medium truncate">
                                    {username || 'Add username'}
                                </span>
                                <BiChevronRight size={22} className="text-[#c4c4c4] shrink-0" />
                            </div>
                        </div>

                        {/* Profile Link Row */}
                        <div 
                            onClick={handleCopyProfileUrl}
                            className="flex items-center justify-between px-4 py-4 cursor-pointer active:bg-gray-50/80 transition-colors"
                        >
                            <span className="text-[#161823] text-[14.5px] font-medium truncate max-w-[80%]">
                                jhumroo.com/@{username || 'user'}
                            </span>
                            <button 
                                onClick={handleCopyProfileUrl}
                                className="text-[#737373] hover:text-black p-1 active:scale-90 transition-transform"
                                aria-label="Copy profile link"
                            >
                                {copied ? (
                                    <BiCheck size={18} className="text-[#00C48C]" />
                                ) : (
                                    <BiCopy size={18} />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 2: Basic Info */}
                <div className="px-4 mt-5">
                    <p className="text-[#8a8b91] text-[13px] font-semibold px-2 mb-2">Basic info</p>
                    <div className="bg-white rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-black/[0.04] overflow-hidden">
                        {/* Bio Row */}
                        <div 
                            onClick={() => {
                                setTempBio(bio);
                                setActiveView('bio');
                            }}
                            className="flex items-center justify-between px-4 py-4 cursor-pointer active:bg-gray-50/80 transition-colors"
                        >
                            <span className="text-[#737373] text-[15px] font-normal">Bio</span>
                            <div className="flex items-center gap-1.5 max-w-[65%]">
                                <span className={`text-[15px] truncate ${bio ? 'text-[#161823] font-medium' : 'text-[#8a8b91] font-normal'}`}>
                                    {bio || 'Add a bio'}
                                </span>
                                <BiChevronRight size={22} className="text-[#c4c4c4] shrink-0" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Photo Picker Bottom Sheet */}
            <PhotoPickerSheet
                isOpen={showPhotoPicker}
                onClose={() => setShowPhotoPicker(false)}
                onFileSelected={handleFileSelected}
                hasExistingPhoto={!!currentUser?.profilePicture?.url}
            />
        </div>
    );
};

export default EditProfilePage;
