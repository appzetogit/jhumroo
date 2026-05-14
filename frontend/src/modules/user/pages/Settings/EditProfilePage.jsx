import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiChevronLeft, BiCamera } from 'react-icons/bi';
import { useAuth } from '../../../../context/AuthContext';
import userService from '../../../../services/userService';

const EditProfilePage = () => {
    const navigate = useNavigate();
    const { user: currentUser, updateUser } = useAuth();
    
    const [fullName, setFullName] = useState(currentUser?.fullName || '');
    const [username, setUsername] = useState(currentUser?.username || '');
    const [bio, setBio] = useState(currentUser?.bio || '');
    const [interests, setInterests] = useState(currentUser?.interests?.join(', ') || '');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await userService.updateProfile({
                fullName,
                username,
                bio,
                interests: interests.split(',').map(i => i.trim()).filter(i => i !== '')
            });
            if (response.success) {
                updateUser(response.user);
                navigate(-1);
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            alert(error?.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        setUploading(true);
        try {
            const response = await userService.uploadProfilePicture(formData);
            if (response.success) {
                // The updateProfile API in backend returns the user, 
                // but uploadProfilePicture might return just the image data.
                // Let's check userService.js - it updates localStorage.
                // We should refresh the user state.
                const updatedUser = { ...currentUser, profilePicture: response.profilePicture };
                updateUser(updatedUser);
            }
        } catch (error) {
            console.error('Failed to upload profile picture:', error);
            alert('Failed to upload profile picture');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="page-container pb-0 theme-surface-page flex flex-col min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-6 pb-6 shrink-0 relative">
                <div 
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center cursor-pointer active:scale-95 transition-transform z-10"
                  onClick={() => navigate(-1)}
                >
                    <BiChevronLeft size={24} className="text-white" />
                </div>
                <h2 className="text-[17px] font-bold text-white absolute left-0 right-0 text-center tracking-wide">Edit profile</h2>
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="text-[15px] font-bold text-[#FE2C55] active:opacity-70 z-10 disabled:opacity-50"
                >
                    {loading ? '...' : 'Save'}
                </button>
            </div>

            <div className="scrollable flex-1 px-4 pb-24">
                {/* Profile Photo Section */}
                <div className="flex flex-col items-center py-8">
                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-upload').click()}>
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 bg-black/20 relative">
                            <img 
                                src={currentUser?.profilePicture?.url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}&style=circle`} 
                                alt={currentUser?.username} 
                                className={`w-full h-full object-cover ${uploading ? 'opacity-50' : ''}`} 
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <BiCamera size={24} className="text-white" />
                            </div>
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="absolute -bottom-1 -right-0 w-8 h-8 rounded-full bg-[#FE2C55] flex items-center justify-center border-2 border-[#161616]">
                            <BiCamera size={16} className="text-white" />
                        </div>
                        <input 
                            id="avatar-upload"
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleFileChange}
                        />
                    </div>
                    <p className="text-white/60 text-[13px] font-medium mt-4">Change photo</p>
                </div>

                {/* Form Section */}
                <div className="space-y-6 mt-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-white/40 text-[12px] font-bold uppercase tracking-widest ml-1">Name</label>
                        <div className="bg-[#242424] rounded-[14px] p-4 flex items-center border border-white/5 focus-within:border-white/20 transition-all">
                            <input 
                                type="text" 
                                value={fullName} 
                                onChange={(e) => setFullName(e.target.value)}
                                className="bg-transparent text-white text-[15px] w-full outline-none font-medium" 
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-white/40 text-[12px] font-bold uppercase tracking-widest ml-1">Username</label>
                        <div className="bg-[#242424] rounded-[14px] p-4 flex items-center border border-white/5 focus-within:border-white/20 transition-all">
                            <span className="text-white/30 text-[15px] mr-0.5">@</span>
                            <input 
                                type="text" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-transparent text-white text-[15px] w-full outline-none font-medium" 
                            />
                        </div>
                        <p className="text-white/30 text-[11px] ml-1">You can change your username once every 30 days.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-white/40 text-[12px] font-bold uppercase tracking-widest ml-1">Bio</label>
                        <div className="bg-[#242424] rounded-[14px] p-4 border border-white/5 focus-within:border-white/20 transition-all">
                            <textarea 
                                value={bio} 
                                onChange={(e) => setBio(e.target.value)}
                                className="bg-transparent text-white text-[15px] w-full outline-none font-medium resize-none h-24 pt-0"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-white/40 text-[12px] font-bold uppercase tracking-widest ml-1">Interests</label>
                        <div className="bg-[#242424] rounded-[14px] p-4 border border-white/5 focus-within:border-white/20 transition-all">
                            <input 
                                type="text" 
                                value={interests} 
                                onChange={(e) => setInterests(e.target.value)}
                                placeholder="Cooking, Travel, Music..."
                                className="bg-transparent text-white text-[15px] w-full outline-none font-medium" 
                            />
                        </div>
                        <p className="text-white/30 text-[11px] ml-1">Separate interests with commas.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditProfilePage;
