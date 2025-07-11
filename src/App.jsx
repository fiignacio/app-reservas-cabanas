import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Users, DollarSign, BarChart2, Plus, Edit, Trash2, Moon, Sun, AlertCircle, CheckCircle, X, Info, ChevronLeft, ChevronRight, Lock, LockOpen, Car, Plane, ClipboardList, FileText, Share2, Mail, MessageSquare } from 'lucide-react';

// --- CONFIGURACIÓN ---
// REEMPLAZA ESTO CON TU PROPIA CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {

  apiKey: "AIzaSyDj95U3l2NH0qWiekGyp4klhg6Ny3T8smU",

  authDomain: "manuarareservas.firebaseapp.com",

  projectId: "manuarareservas",

  storageBucket: "manuarareservas.firebasestorage.app",

  messagingSenderId: "93580658717",

  appId: "1:93580658717:web:685e2d16cc669498159ef4",

  measurementId: "G-8CJF38FQH8"

};

const CABIN_CONFIG = {
    'pequena': { name: 'Cabaña Pequeña', capacity: 3, count: 1 },
    'mediana': { name: 'Cabaña Mediana', capacity: 4, count: 2 },
    'grande': { name: 'Cabaña Grande', capacity: 6, count: 1 },
};

const PRICING_CONFIG = {
    adult: 25000,
    child: 15000,
    toddler: 0,
};

// --- INICIALIZACIÓN DE FIREBASE ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- COMPONENTES DE UI ---

const StatCard = ({ icon, title, value, color }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex items-center">
        <div className={`p-3 rounded-full mr-4 ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    </div>
);

const Notification = ({ message, type, onClose }) => {
    if (!message) return null;
    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900';
    const borderColor = isSuccess ? 'border-green-500' : 'border-red-500';
    const textColor = isSuccess ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200';
    const Icon = isSuccess ? CheckCircle : AlertCircle;

    return (
        <div className={`fixed top-5 right-5 max-w-sm w-full p-4 rounded-lg border-l-4 shadow-lg ${bgColor} ${borderColor} ${textColor} z-50`} role="alert">
            <div className="flex items-start">
                <Icon className="h-6 w-6 mr-3" />
                <div className="flex-1">
                    <p className="font-semibold">{isSuccess ? 'Éxito' : 'Error'}</p>
                    <p>{message}</p>
                </div>
                <button onClick={onClose} className="ml-3 -mt-1 -mr-1 p-1 rounded-full hover:bg-white/20">
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full">
                <div className="flex items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">{title}</h3>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{message}</p>
                        </div>
                    </div>
                </div>
                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                        onClick={onConfirm}
                    >
                        Confirmar
                    </button>
                    <button
                        type="button"
                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                        onClick={onCancel}
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DE LA APLICACIÓN ---

export default function App() {
    // --- ESTADOS ---
    const [bookings, setBookings] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [view, setView] = useState('calendar');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [darkMode, setDarkMode] = useState(false);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, bookingId: null });
    const [eventLogModal, setEventLogModal] = useState({ isOpen: false, booking: null });

    // --- EFECTOS ---
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Error signing in anonymously:", error);
                    setNotification({ message: 'No se pudo conectar al servicio. Intente recargar.', type: 'error' });
                }
            }
            setIsAuthReady(true);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!isAuthReady || !auth.currentUser) return;
        
        const q = query(collection(db, "reservations"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const bookingsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                events: doc.data().events || [],
            }));
            setBookings(bookingsData);
        }, (error) => {
            console.error("Error fetching bookings:", error);
            setNotification({ message: 'Error al cargar las reservas.', type: 'error' });
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

    const calculateTotalCost = (adults, children, checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 0;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (checkOutDate <= checkInDate) return 0;
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (nights <= 0) return 0;
        const cost = (Number(adults) * PRICING_CONFIG.adult + Number(children) * PRICING_CONFIG.child) * nights;
        return cost;
    };

    const checkAvailability = async (cabinId, checkIn, checkOut, excludingBookingId = null) => {
        const newCheckIn = new Date(checkIn);
        const newCheckOut = new Date(checkOut);

        const q = query(collection(db, "reservations"), where("cabinId", "==", cabinId));
        const querySnapshot = await getDocs(q);

        for (const doc of querySnapshot.docs) {
            if (doc.id === excludingBookingId) continue;

            const booking = doc.data();
            const existingCheckIn = new Date(booking.checkIn);
            const existingCheckOut = new Date(booking.checkOut);

            if (newCheckIn < existingCheckOut && newCheckOut > existingCheckIn) {
                return false; 
            }
        }
        return true; 
    };

    const findAvailableCabinId = async (cabinType, checkIn, checkOut, excludingBookingId = null) => {
        const { count } = CABIN_CONFIG[cabinType];
        for (let i = 1; i <= count; i++) {
            const cabinId = `${cabinType}-${i}`;
            const isAvailable = await checkAvailability(cabinId, checkIn, checkOut, excludingBookingId);
            if (isAvailable) {
                return cabinId;
            }
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
                depositAmount: Number(formData.depositAmount),
                depositPaid: Boolean(formData.depositPaid),
                totalCost: isPriceOverridden ? Number(formData.totalCost) : calculateTotalCost(formData.adults, formData.children, formData.checkIn, formData.checkOut),
                isPriceOverridden: isPriceOverridden,
                hasVehicle: Boolean(formData.hasVehicle),
                arrivalFlight: formData.arrivalFlight || '',
                departureFlight: formData.departureFlight || '',
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

    const handleDeleteBooking = async (bookingId) => {
        // ... (same as before)
    };
    
    const handleAddEvent = async (bookingId, eventText) => {
        // ... (same as before)
    };

    const openModal = (booking = null) => { setEditingBooking(booking); setIsModalOpen(true); };
    const closeModal = () => { setIsModalOpen(false); setEditingBooking(null); };
    const openQuoteModal = () => setIsQuoteModalOpen(true);
    const closeQuoteModal = () => setIsQuoteModalOpen(false);
    const openDeleteConfirmation = (bookingId) => { setDeleteConfirmation({ isOpen: true, bookingId }); };
    const closeDeleteConfirmation = () => { setDeleteConfirmation({ isOpen: false, bookingId: null }); };
    const openEventLogModal = (booking) => { setEventLogModal({ isOpen: true, booking }); };
    const closeEventLogModal = () => { setEventLogModal({ isOpen: false, booking: null }); };

    const changeMonth = (offset) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    // --- RENDERIZADO DE COMPONENTES ---

    const QuoteModal = () => {
        const [quoteData, setQuoteData] = useState({
            checkIn: '', checkOut: '', adults: 1, children: 0, cabinType: 'pequena'
        });
        const [result, setResult] = useState(null);

        const handleChange = (e) => {
            const { name, value } = e.target;
            setQuoteData(prev => ({ ...prev, [name]: value }));
        };

        const handleQuote = () => {
            const totalCost = calculateTotalCost(quoteData.adults, quoteData.children, quoteData.checkIn, quoteData.checkOut);
            const nights = Math.ceil((new Date(quoteData.checkOut) - new Date(quoteData.checkIn)) / (1000 * 60 * 60 * 24));
            setResult({ ...quoteData, totalCost, nights });
        };

        const getShareMessage = () => {
            if (!result) return '';
            const message = `*Cotización de Estadía*\n\n` +
                            `Hola, te envío los detalles de tu cotización:\n\n` +
                            `*Check-in:* ${new Date(result.checkIn).toLocaleDateString('es-CL')}\n` +
                            `*Check-out:* ${new Date(result.checkOut).toLocaleDateString('es-CL')}\n` +
                            `*Noches:* ${result.nights}\n` +
                            `*Cabaña:* ${CABIN_CONFIG[result.cabinType].name}\n` +
                            `*Huéspedes:* ${result.adults} Adulto(s), ${result.children} Niño(s)\n\n` +
                            `*Valor Total:* $${result.totalCost.toLocaleString('es-CL')}\n\n` +
                            `¡Esperamos tu confirmación!`;
            return encodeURIComponent(message);
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-lg w-full">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Generar Cotización</h2>
                        <button onClick={closeQuoteModal} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X/></button>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Check-in</label>
                                <input type="date" name="checkIn" value={quoteData.checkIn} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Check-out</label>
                                <input type="date" name="checkOut" value={quoteData.checkOut} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"/>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adultos</label>
                                <input type="number" name="adults" min="1" value={quoteData.adults} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Niños</label>
                                <input type="number" name="children" min="0" value={quoteData.children} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Cabaña</label>
                            <select name="cabinType" value={quoteData.cabinType} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
                                {Object.entries(CABIN_CONFIG).map(([key, { name }]) => (<option key={key} value={key}>{name}</option>))}
                            </select>
                        </div>
                        <button onClick={handleQuote} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Cotizar</button>
                        
                        {result && (
                            <div className="border-t dark:border-gray-600 pt-4 mt-4 space-y-3">
                                <h3 className="text-lg font-semibold">Resultado de la Cotización</h3>
                                <p><strong>Total:</strong> ${result.totalCost.toLocaleString('es-CL')}</p>
                                <div className="flex space-x-2">
                                    <a href={`https://wa.me/?text=${getShareMessage()}`} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">
                                        <MessageSquare size={18} className="mr-2"/> WhatsApp
                                    </a>
                                    <a href={`mailto:?subject=Cotización de Estadía&body=${getShareMessage()}`} className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                                        <Mail size={18} className="mr-2"/> Correo
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const BookingFormModal = () => { /* ... same as before ... */ return <div/> };
    const EventLogModal = () => { /* ... same as before ... */ return <div/> };
    const TimelineCalendarView = () => { /* ... same as before ... */ return <div/> };
    const BookingListView = () => { /* ... same as before ... */ return <div/> };
    const DashboardView = () => { /* ... same as before ... */ return <div/> };

    return (
        <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
            <style>{` input:checked ~ .dot { transform: translateX(1.75rem); } `}</style>
            <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
            {isModalOpen && <BookingFormModal />}
            {isQuoteModalOpen && <QuoteModal />}
            {eventLogModal.isOpen && <EventLogModal />}
            <ConfirmationModal 
                isOpen={deleteConfirmation.isOpen}
                title="Confirmar Eliminación"
                message="¿Estás seguro de que quieres eliminar esta reserva? Esta acción no se puede deshacer."
                onConfirm={() => handleDeleteBooking(deleteConfirmation.bookingId)}
                onCancel={closeDeleteConfirmation}
            />

            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Mis Cabañas</h1>
                    <div className="flex items-center space-x-2">
                        <button onClick={openQuoteModal} className="flex items-center space-x-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition" title="Generar Cotización">
                            <FileText size={20} />
                            <span className="hidden md:inline">Cotizar</span>
                        </button>
                        <button onClick={() => openModal()} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition" title="Crear Nueva Reserva">
                            <Plus size={20} />
                            <span className="hidden md:inline">Reserva</span>
                        </button>
                        <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
                            {darkMode ? <Sun /> : <Moon />}
                        </button>
                    </div>
                </div>
            </header>

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
                        <TimelineCalendarView />
                        <BookingListView />
                    </div>
                ) : (
                    <DashboardView />
                )}
            </main>
        </div>
    );
}

