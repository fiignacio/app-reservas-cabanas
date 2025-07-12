import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Calendar, Users, DollarSign, BarChart2, Plus, Edit, Trash2, Moon, Sun, AlertCircle, CheckCircle, X, Info, ChevronLeft, ChevronRight, Lock, LockOpen, Car, Plane, ClipboardList, FileText, Download, Archive, Bell, Mail, MessageSquare } from 'lucide-react';

// --- CONFIGURACIÓN ---
const firebaseConfig = {

  apiKey: "AIzaSyDj95U3l2NH0qWiekGyp4klhg6Ny3T8smU",

  authDomain: "manuarareservas.firebaseapp.com",

  projectId: "manuarareservas",

  storageBucket: "manuarareservas.firebasestorage.app",

  messagingSenderId: "93580658717",

  appId: "1:93580658717:web:685e2d16cc669498159ef4",

  measurementId: "G-8CJF38FQH8"

};


const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

const CABIN_CONFIG = {
    'pequena': { name: 'Cabaña Pequeña', capacity: 3, count: 1, color: { low: { light: '#e0e7ff', dark: '#312e81' }, high: { light: '#c7d2fe', dark: '#4338ca' } } }, // Indigo
    'mediana': { name: 'Cabaña Mediana', capacity: 4, count: 2, color: { low: { light: '#d1fae5', dark: '#064e3b' }, high: { light: '#a7f3d0', dark: '#065f46' } } }, // Green
    'grande': { name: 'Cabaña Grande', capacity: 6, count: 1, color: { low: { light: '#fee2e2', dark: '#7f1d1d' }, high: { light: '#fecaca', dark: '#991b1b' } } },  // Red
};

const PRICING_CONFIG = {
    low: { adult: 25000, child: 15000, toddler: 0 },
    high: { adult: 30000, child: 15000, toddler: 0 },
};

// --- INICIALIZACIÓN DE FIREBASE ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- COMPONENTES DE UI ---
const StatCard = ({ icon, title, value, color }) => ( <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex items-center"><div className={`p-3 rounded-full mr-4 ${color}`}>{icon}</div><div><p className="text-sm text-gray-500 dark:text-gray-400">{title}</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p></div></div> );
const Notification = ({ message, type, onClose }) => { if (!message) return null; const isSuccess = type === 'success'; const bgColor = isSuccess ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'; const borderColor = isSuccess ? 'border-green-500' : 'border-red-500'; const textColor = isSuccess ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'; const Icon = isSuccess ? CheckCircle : AlertCircle; return (<div className={`fixed top-5 right-5 max-w-sm w-full p-4 rounded-lg border-l-4 shadow-lg ${bgColor} ${borderColor} ${textColor} z-50`} role="alert"><div className="flex items-start"><Icon className="h-6 w-6 mr-3" /><div className="flex-1"><p className="font-semibold">{isSuccess ? 'Éxito' : 'Error'}</p><p>{message}</p></div><button onClick={onClose} className="ml-3 -mt-1 -mr-1 p-1 rounded-full hover:bg-white/20"><X className="h-5 w-5" /></button></div></div>);};
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => { if (!isOpen) return null; return (<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full"><div className="flex items-start"><div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10"><AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" /></div><div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left"><h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">{title}</h3><div className="mt-2"><p className="text-sm text-gray-500 dark:text-gray-400">{message}</p></div></div></div><div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse"><button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm" onClick={onConfirm}>Confirmar</button><button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm" onClick={onCancel}>Cancelar</button></div></div></div>);};


// --- COMPONENTE PRINCIPAL DE LA APLICACIÓN ---

export default function App() {
    // --- ESTADOS ---
    const [allBookings, setAllBookings] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('calendar');
    const [calendarSubView, setCalendarSubView] = useState('active'); // 'active' o 'archived'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [darkMode, setDarkMode] = useState(false);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, bookingId: null });
    const [eventLogModal, setEventLogModal] = useState({ isOpen: false, booking: null });

    const { activeBookings, archivedBookings, upcomingArrivals } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const active = [];
        const archived = [];

        allBookings.forEach(booking => {
            const checkOutDate = new Date(booking.checkOut);
            if (checkOutDate < today) {
                archived.push(booking);
            } else {
                active.push(booking);
            }
        });

        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(today.getDate() + 2);

        const arrivals = active.filter(b => {
            const checkInDate = new Date(b.checkIn);
            checkInDate.setHours(0,0,0,0);
            return checkInDate >= today && checkInDate <= twoDaysFromNow;
        });

        return { 
            activeBookings: active, 
            archivedBookings: archived.sort((a,b) => new Date(b.checkOut) - new Date(a.checkOut)), 
            upcomingArrivals: arrivals 
        };
    }, [allBookings]);


    // --- EFECTOS ---
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Error signing in anonymously:", error);
                }
            }
            setIsAuthReady(true);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!isAuthReady) return;
        const q = query(collection(db, "reservations"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const bookingsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                events: doc.data().events || [],
            }));
            setAllBookings(bookingsData);
        }, (error) => {
            console.error("Error fetching bookings:", error);
        });
        return () => unsubscribe();
    }, [isAuthReady]);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // --- LÓGICA DE NEGOCIO ---
    const calculateTotalCost = (adults, children, checkIn, checkOut, season = 'low') => {
        if (!checkIn || !checkOut) return 0;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (checkOutDate <= checkInDate) return 0;
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (nights <= 0) return 0;
        const prices = PRICING_CONFIG[season] || PRICING_CONFIG.low;
        const cost = (Number(adults) * prices.adult + Number(children) * prices.child) * nights;
        return cost;
    };

    const findAvailableCabinId = async (cabinType, checkIn, checkOut, excludingBookingId = null) => {
        const { count } = CABIN_CONFIG[cabinType];
        for (let i = 1; i <= count; i++) {
            const cabinId = `${cabinType}-${i}`;
            const q = query(collection(db, "reservations"), where("cabinId", "==", cabinId));
            const querySnapshot = await getDocs(q);
            let isAvailable = true;
            for (const doc of querySnapshot.docs) {
                if (doc.id === excludingBookingId) continue;
                const b = doc.data();
                if (new Date(checkIn) < new Date(b.checkOut) && new Date(checkOut) > new Date(b.checkIn)) {
                    isAvailable = false;
                    break;
                }
            }
            if (isAvailable) return cabinId;
        }
        return null;
    };

    // --- MANEJADORES DE EVENTOS ---
    const handleSaveBooking = async (formData, isPriceOverridden) => {
        // ... (Validations)
        try {
            const availableCabinId = await findAvailableCabinId(formData.cabinType, formData.checkIn, formData.checkOut, editingBooking ? editingBooking.id : null);
            if (!availableCabinId) {
                setNotification({ message: `No hay ${CABIN_CONFIG[formData.cabinType].name}s disponibles para las fechas seleccionadas.`, type: 'error' });
                return;
            }
            const bookingData = {
                ...formData,
                adults: Number(formData.adults),
                children: Number(formData.children),
                toddlers: Number(formData.toddlers),
                totalCost: isPriceOverridden ? Number(formData.totalCost) : calculateTotalCost(formData.adults, formData.children, formData.checkIn, formData.checkOut, formData.season),
                cabinId: availableCabinId,
                updatedAt: new Date().toISOString(),
            };
            if (editingBooking) {
                const bookingRef = doc(db, 'reservations', editingBooking.id);
                delete bookingData.events; 
                await updateDoc(bookingRef, bookingData);
                setNotification({ message: 'Reserva actualizada con éxito.', type: 'success' });
            } else {
                bookingData.createdAt = new Date().toISOString();
                bookingData.events = [];
                await addDoc(collection(db, 'reservations'), bookingData);
                setNotification({ message: 'Reserva creada con éxito.', type: 'success' });
            }
            closeModal();
        } catch (error) {
            console.error("Error saving booking: ", error);
            setNotification({ message: 'Ocurrió un error al guardar la reserva.', type: 'error' });
        }
    };

    const handleDeleteBooking = async (bookingId) => { /* ... */ };
    const handleAddEvent = async (bookingId, eventText) => { /* ... */ };
    const openModal = (booking = null) => { setEditingBooking(booking); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingBooking(null); };
    const openQuoteModal = () => setIsQuoteModalOpen(true);
    const closeQuoteModal = () => setIsQuoteModalOpen(false);
    const openDeleteConfirmation = (bookingId) => { setDeleteConfirmation({ isOpen: true, bookingId }); };
    const closeDeleteConfirmation = () => { setDeleteConfirmation({ isOpen: false, bookingId: null }); };
    const openEventLogModal = (booking) => { setEventLogModal({ isOpen: true, booking }); };
    const closeEventLogModal = () => { setEventLogModal({ isOpen: false, booking: null }); };
    const changeMonth = (offset) => { setCurrentDate(prevDate => { const newDate = new Date(prevDate); newDate.setMonth(newDate.getMonth() + offset); return newDate; }); };

    // --- PDF Generation ---
    const exportMonthlyBookingsPDF = () => { /* ... */ };
    
    // --- RENDERIZADO DE COMPONENTES ---

    const QuoteModal = () => { /* ... */ };
    const BookingFormModal = () => { /* ... */ };
    const EventLogModal = () => { /* ... */ };

    const TimelineCalendarView = ({ bookingsToDisplay }) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        
        const allCabins = useMemo(() => {
            const cabins = [];
            Object.entries(CABIN_CONFIG).forEach(([type, { name, count, color }]) => {
                for (let i = 1; i <= count; i++) {
                    cabins.push({ id: `${type}-${i}`, name: `${name} ${i}`, type, color });
                }
            });
            return cabins;
        }, []);

        return (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md overflow-x-auto">
                <div className="flex justify-between items-center mb-4 sticky left-0">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronLeft/></button>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                        {currentDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                    </h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><ChevronRight/></button>
                </div>
                <div className="inline-block min-w-full">
                    <div className="grid" style={{ gridTemplateColumns: `150px repeat(${daysInMonth}, minmax(80px, 1fr))` }}>
                        <div className="sticky left-0 bg-white dark:bg-gray-800 z-10 font-semibold p-2 border-b border-r dark:border-gray-700">Cabaña</div>
                        {days.map(day => (
                            <div key={day} className="text-center font-semibold p-2 border-b dark:border-gray-700">{day}</div>
                        ))}
                        
                        {allCabins.map((cabin, cabinIndex) => (
                            <React.Fragment key={cabin.id}>
                                <div className={`sticky left-0 z-10 font-medium p-2 border-r dark:border-gray-700 ${cabinIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}`}>{cabin.name}</div>
                                {days.map(day => {
                                    const bookingOnThisDay = bookingsToDisplay.find(b => {
                                        const checkIn = new Date(b.checkIn);
                                        const checkOut = new Date(b.checkOut);
                                        checkIn.setHours(0,0,0,0);
                                        checkOut.setHours(0,0,0,0);
                                        const currentDayStart = new Date(year, month, day);
                                        return b.cabinId === cabin.id && currentDayStart >= checkIn && currentDayStart < checkOut;
                                    });

                                    const isStart = bookingOnThisDay && new Date(year, month, day).getTime() === new Date(bookingOnThisDay.checkIn).getTime();
                                    const colorSet = bookingOnThisDay ? CABIN_CONFIG[bookingOnThisDay.cabinType].color[bookingOnThisDay.season || 'low'] : null;

                                    return (
                                        <div key={day} className={`border-b dark:border-gray-700 relative h-12 ${cabinIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}`}>
                                            {bookingOnThisDay && (
                                                <div 
                                                    onClick={() => openModal(bookingOnThisDay)}
                                                    className={`h-full flex items-center text-xs cursor-pointer whitespace-nowrap overflow-hidden ${isStart ? 'pl-2' : ''}`} 
                                                    style={{backgroundColor: darkMode ? colorSet.dark : colorSet.light, color: darkMode ? '#fff' : '#000'}}
                                                    title={bookingOnThisDay.guestName}
                                                >
                                                    {isStart && 
                                                        <span className="font-semibold truncate">
                                                            {bookingOnThisDay.guestName} ({ (bookingOnThisDay.adults || 0) + (bookingOnThisDay.children || 0) + (bookingOnThisDay.toddlers || 0) }p)
                                                        </span>
                                                    }
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>
        );
    };
    
    const BookingListView = ({ bookingsToDisplay, title }) => {
        const sortedBookings = [...bookingsToDisplay].sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

        return (
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{title}</h3>
                    {title === "Reservas Activas" && 
                        <button onClick={exportMonthlyBookingsPDF} className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition">
                            <Download size={18}/>
                            <span>Exportar Mes</span>
                        </button>
                    }
                </div>
                {/* Table ... */}
            </div>
        );
    };

    const AlertsPanel = ({ arrivals }) => {
        if (arrivals.length === 0) return null;

        const getWhatsAppMessage = (arrival) => {
            const message = `*Recordatorio de Llegada Próxima*\n\n` +
                            `*Huésped:* ${arrival.guestName}\n` +
                            `*Llega en:* ${new Date(arrival.checkIn).toLocaleDateString('es-CL')}\n` +
                            `*Pasajeros:* ${(arrival.adults || 0) + (arrival.children || 0) + (arrival.toddlers || 0)}\n` +
                            `*Vuelo de llegada:* ${arrival.arrivalFlight || 'No especificado'}`;
            return encodeURIComponent(message);
        };
        
        const getEmailBody = (arrival) => {
            return encodeURIComponent(
                `Hola,\n\nEste es un recordatorio para la siguiente llegada:\n\n` +
                `Huésped: ${arrival.guestName}\n` +
                `Fecha de llegada: ${new Date(arrival.checkIn).toLocaleDateString('es-CL')}\n` +
                `Cantidad de pasajeros: ${(arrival.adults || 0) + (arrival.children || 0) + (arrival.toddlers || 0)}\n` +
                `Vuelo de llegada: ${arrival.arrivalFlight || 'No especificado'}\n\n` +
                `Saludos,\nTu App de Reservas`
            );
        };

        return (
            <div className="bg-yellow-100 dark:bg-yellow-900 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg shadow-md mb-6">
                <div className="flex items-center mb-3">
                    <Bell className="h-6 w-6 mr-3"/>
                    <h3 className="text-lg font-bold">Próximas Llegadas ({arrivals.length})</h3>
                </div>
                <div className="space-y-3">
                    {arrivals.map(arrival => (
                        <div key={arrival.id} className="bg-white/50 dark:bg-black/20 p-3 rounded-md flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div>
                                <p className="font-bold">{arrival.guestName}</p>
                                <p className="text-sm">Llega: {new Date(arrival.checkIn).toLocaleDateString('es-CL')} | {`Vuelo: ${arrival.arrivalFlight || 'N/A'}`} | Pasajeros: {(arrival.adults || 0) + (arrival.children || 0) + (arrival.toddlers || 0)}</p>
                            </div>
                            <div className="flex space-x-2 mt-2 md:mt-0">
                                <a href={`https://wa.me/56984562244?text=${getWhatsAppMessage(arrival)}`} target="_blank" rel="noopener noreferrer" className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600"><MessageSquare size={16}/></a>
                                <a href={`mailto:cabanasmanuara@gmail.com?subject=Recordatorio de Llegada: ${arrival.guestName}&body=${getEmailBody(arrival)}`} className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"><Mail size={16}/></a>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const DashboardView = () => { /* ... */ };

    return (
        <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
            {/* Styles, Modals, Header ... */}
            <main className="container mx-auto p-4 md:p-6">
                <div className="flex justify-center mb-6 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
                    <button onClick={() => setView('calendar')} className={`w-1/2 py-2 rounded-md flex items-center justify-center space-x-2 transition ${view === 'calendar' ? 'bg-white dark:bg-gray-800 shadow' : ''}`}>
                        <Calendar size={20} />
                        <span>Calendario</span>
                    </button>
                    <button onClick={() => setView('dashboard')} className={`w-1/2 py-2 rounded-md flex items-center justify-center space-x-2 transition ${view === 'dashboard' ? 'bg-white dark:bg-gray-800 shadow' : ''}`}>
                        <BarChart2 size={20} />
                        <span>Reportería</span>
                    </button>
                </div>

                {view === 'calendar' ? (
                    <div>
                        <div className="flex border-b dark:border-gray-700 mb-4">
                            <button onClick={() => setCalendarSubView('active')} className={`px-4 py-2 text-sm font-medium ${calendarSubView === 'active' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Activas</button>
                            <button onClick={() => setCalendarSubView('archived')} className={`px-4 py-2 text-sm font-medium ${calendarSubView === 'archived' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Archivo</button>
                        </div>
                        {calendarSubView === 'active' ? (
                            <>
                                <TimelineCalendarView bookingsToDisplay={activeBookings} />
                                <BookingListView bookingsToDisplay={activeBookings} title="Reservas Activas"/>
                            </>
                        ) : (
                            <BookingListView bookingsToDisplay={archivedBookings} title="Reservas Archivadas"/>
                        )}
                    </div>
                ) : (
                    <>
                        <AlertsPanel arrivals={upcomingArrivals} />
                        <DashboardView />
                    </>
                )}
            </main>
        </div>
    );
}
