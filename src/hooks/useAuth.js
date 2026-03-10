import { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check current session
        authService.getSession().then((session) => {
            if (session?.user) {
                setUser(session.user);
                // Fetch profile but don't hold the loading state if it takes too long
                const profilePromise = profileService.getProfile(session.user.id);

                // Set a timeout for the profile fetch so it doesn't block the UI
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
                );

                Promise.race([profilePromise, timeoutPromise])
                    .then((profileData) => {
                        setProfile(profileData);
                        setLoading(false);
                    })
                    .catch((err) => {
                        console.warn('Profile fetch slow or failed:', err.message);
                        setLoading(false); // Stop loading even if profile is slow
                    });
            } else {
                setLoading(false);
            }
        }).catch((err) => {
            console.error('Session check failed:', err);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = authService.onAuthStateChange(
            async (event, session) => {
                setUser(session?.user ?? null);

                if (session?.user) {
                    try {
                        const profileData = await profileService.getProfile(session.user.id);
                        setProfile(profileData);
                    } catch (error) {
                        console.error('Error fetching profile:', error);
                    }
                } else {
                    setProfile(null);
                }
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    return { user, profile, loading };
};
