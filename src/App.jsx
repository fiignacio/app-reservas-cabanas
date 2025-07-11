import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Calendar, Users, DollarSign, BarChart2, Plus, Edit, Trash2, Moon, Sun, AlertCircle, CheckCircle, X, Info, ChevronLeft, ChevronRight, Lock, LockOpen, Car, Plane, ClipboardList, FileText, Download, TrendingUp } from 'lucide-react';

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
    low: { adult: 25000, child: 15000, toddler: 0 },
    high: { adult: 30000, child: 15000, toddler: 0 },
};

// --- INICIALIZACIÓN DE FIREBASE ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- COMPONENTES DE UI (StatCard, Notification, ConfirmationModal - Sin cambios) ---
const StatCard = ({ icon, title, value, color }) => ( <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex items-center"><div className={`p-3 rounded-full mr-4 ${color}`}>{icon}</div><div><p className="text-sm text-gray-500 dark:text-gray-400">{title}</p><p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p></div></div> );
const Notification = ({ message, type, onClose }) => { if (!message) return null; const isSuccess = type === 'success'; const bgColor = isSuccess ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'; const borderColor = isSuccess ? 'border-green-500' : 'border-red-500'; const textColor = isSuccess ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'; const Icon = isSuccess ? CheckCircle : AlertCircle; return (<div className={`fixed top-5 right-5 max-w-sm w-full p-4 rounded-lg border-l-4 shadow-lg ${bgColor} ${borderColor} ${textColor} z-50`} role="alert"><div className="flex items-start"><Icon className="h-6 w-6 mr-3" /><div className="flex-1"><p className="font-semibold">{isSuccess ? 'Éxito' : 'Error'}</p><p>{message}</p></div><button onClick={onClose} className="ml-3 -mt-1 -mr-1 p-1 rounded-full hover:bg-white/20"><X className="h-5 w-5" /></button></div></div>);};
const ConfirmationModal = ({ isOpen, title, message, onConfirm, onCancel }) => { if (!isOpen) return null; return (<div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"><div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-sm w-full"><div className="flex items-start"><div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900 sm:mx-0 sm:h-10 sm:w-10"><AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" /></div><div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left"><h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">{title}</h3><div className="mt-2"><p className="text-sm text-gray-500 dark:text-gray-400">{message}</p></div></div></div><div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse"><button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm" onClick={onConfirm}>Confirmar</button><button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm" onClick={onCancel}>Cancelar</button></div></div></div>);};


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

    const calculateTotalCost = (adults, children, checkIn, checkOut, season = 'low') => {
        if (!checkIn || !checkOut) return 0;
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        if (checkOutDate <= checkInDate) return 0;
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (nights <= 0) return 0;
        const prices = PRICING_CONFIG[season];
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
        // Validations...
        
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

    const changeMonth = (offset) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    // --- PDF Generation ---
    const generatePdf = (title, head, body, fileName) => {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(20);
        doc.text(title, 14, 22);
        doc.setFontSize(12);
        doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString('es-CL')}`, 14, 30);
        
        // Table
        doc.autoTable({
            head: head,
            body: body,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [41, 128, 185] },
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(10);
            doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'center' });
        }
        
        doc.save(`${fileName}.pdf`);
    };

    const exportMonthlyBookingsPDF = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const monthlyBookings = bookings.filter(b => {
            const checkIn = new Date(b.checkIn);
            return checkIn.getFullYear() === year && checkIn.getMonth() === month;
        });

        if (monthlyBookings.length === 0) {
            setNotification({ message: 'No hay reservas para exportar en el mes seleccionado.', type: 'error' });
            return;
        }

        const head = [['Huésped', 'Check-in', 'Check-out', 'Cabaña', 'Pasajeros', 'Total', 'Temporada']];
        const body = monthlyBookings.map(b => [
            b.guestName,
            new Date(b.checkIn).toLocaleDateString('es-CL'),
            new Date(b.checkOut).toLocaleDateString('es-CL'),
            `${CABIN_CONFIG[b.cabinType].name} (${b.cabinId})`,
            (b.adults || 0) + (b.children || 0) + (b.toddlers || 0),
            `$${b.totalCost.toLocaleString('es-CL')}`,
            b.season === 'high' ? 'Alta' : 'Baja'
        ]);

        const monthName = currentDate.toLocaleString('es-CL', { month: 'long' });
        const title = `Reporte de Reservas - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
        generatePdf(title, head, body, `Reporte_Reservas_${monthName}_${year}`);
    };
    
    // --- RENDERIZADO DE COMPONENTES ---

    const QuoteModal = () => {
        const [quoteData, setQuoteData] = useState({
            checkIn: '', checkOut: '', adults: 1, children: 0, cabinType: 'pequena', season: 'low'
        });
        const [result, setResult] = useState(null);

        const handleChange = (e) => {
            const { name, value, type, checked } = e.target;
            setQuoteData(prev => ({ ...prev, [name]: type === 'checkbox' ? (checked ? 'high' : 'low') : value }));
        };

        const handleQuote = () => {
            const totalCost = calculateTotalCost(quoteData.adults, quoteData.children, quoteData.checkIn, quoteData.checkOut, quoteData.season);
            const nights = Math.ceil((new Date(quoteData.checkOut) - new Date(quoteData.checkIn)) / (1000 * 60 * 60 * 24));
            setResult({ ...quoteData, totalCost, nights });
        };

        const handleGeneratePDF = () => {
            if (!result) return;
            const doc = new jsPDF();
            
            // Header
            doc.setFontSize(22);
            doc.setTextColor(40);
            doc.text("Cotización de Estadía", 105, 22, { align: 'center' });

            // Details
            doc.setFontSize(12);
            doc.setTextColor(100);
            const details = [
                ['Check-in:', new Date(result.checkIn).toLocaleDateString('es-CL')],
                ['Check-out:', new Date(result.checkOut).toLocaleDateString('es-CL')],
                ['Noches:', result.nights],
                ['Cabaña:', CABIN_CONFIG[result.cabinType].name],
                ['Huéspedes:', `${result.adults} Adulto(s), ${result.children} Niño(s)`],
                ['Temporada:', result.season === 'high' ? 'Alta' : 'Baja'],
            ];
            doc.autoTable({
                body: details,
                startY: 40,
                theme: 'plain',
                styles: { fontSize: 12 },
                columnStyles: { 0: { fontStyle: 'bold' } }
            });

            // Total
            doc.setFontSize(16);
            doc.setTextColor(40);
            doc.text("Valor Total:", 14, doc.autoTable.previous.finalY + 20);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${result.totalCost.toLocaleString('es-CL')}`, 50, doc.autoTable.previous.finalY + 20);
            
            doc.save(`Cotizacion_Cabañas.pdf`);
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-lg w-full">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Generar Cotización</h2>
                        <button onClick={closeQuoteModal} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X/></button>
                    </div>
                    {/* Form fields ... */}
                    <div className="flex items-center my-4">
                        <input id="season_quote" name="season" type="checkbox" checked={quoteData.season === 'high'} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        <label htmlFor="season_quote" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Temporada Alta</label>
                    </div>
                    <button onClick={handleQuote} className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Cotizar</button>
                    
                    {result && (
                        <div className="border-t dark:border-gray-600 pt-4 mt-4 space-y-3">
                            <h3 className="text-lg font-semibold">Resultado de la Cotización</h3>
                            <p><strong>Total:</strong> ${result.totalCost.toLocaleString('es-CL')}</p>
                            <button onClick={handleGeneratePDF} className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                                <Download size={18} className="mr-2"/> Descargar PDF
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const BookingFormModal = () => {
        const initialFormData = {
            guestName: '', checkIn: '', checkOut: '',
            adults: 1, children: 0, toddlers: 0,
            cabinType: 'pequena', depositPaid: false, depositAmount: 0,
            totalCost: 0, hasVehicle: false, arrivalFlight: '', departureFlight: '',
            season: 'low'
        };
        const [formData, setFormData] = useState(editingBooking || initialFormData);
        const [isPriceOverridden, setIsPriceOverridden] = useState(editingBooking?.isPriceOverridden || false);

        useEffect(() => {
            const bookingToEdit = editingBooking || initialFormData;
            const calculatedCost = calculateTotalCost(bookingToEdit.adults, bookingToEdit.children, bookingToEdit.checkIn, bookingToEdit.checkOut, bookingToEdit.season);
            
            setFormData({
                ...bookingToEdit,
                totalCost: editingBooking?.isPriceOverridden ? editingBooking.totalCost : calculatedCost,
            });
            setIsPriceOverridden(editingBooking?.isPriceOverridden || false);
        }, [editingBooking]);
        
        useEffect(() => {
            if (!isPriceOverridden) {
                const newTotal = calculateTotalCost(formData.adults, formData.children, formData.checkIn, formData.checkOut, formData.season);
                setFormData(prev => ({ ...prev, totalCost: newTotal }));
            }
        }, [formData.adults, formData.children, formData.checkIn, formData.checkOut, formData.season, isPriceOverridden]);


        const handleChange = (e) => {
            const { name, value, type, checked } = e.target;
            const val = type === 'checkbox' ? (name === 'season' ? (checked ? 'high' : 'low') : checked) : value;
            setFormData(prev => ({ ...prev, [name]: val }));
        };

        const handleSubmit = (e) => {
            e.preventDefault();
            handleSaveBooking(formData, isPriceOverridden);
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40 overflow-y-auto p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-lg w-full">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">{editingBooking ? 'Editar Reserva' : 'Nueva Reserva'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Form fields... */}
                        <div className="flex items-center">
                            <input id="season_booking" name="season" type="checkbox" checked={formData.season === 'high'} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <label htmlFor="season_booking" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Temporada Alta</label>
                        </div>
                        {/* Other form fields... */}
                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Guardar Reserva</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };
    
    const EventLogModal = () => { /* ... same as before ... */ return <div/> };

    const TimelineCalendarView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        
        const allCabins = useMemo(() => {
            const cabins = [];
            Object.entries(CABIN_CONFIG).forEach(([type, { name, count }]) => {
                for (let i = 1; i <= count; i++) {
                    cabins.push({ id: `${type}-${i}`, name: `${name} ${i}` });
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
                    <div className="grid" style={{ gridTemplateColumns: `150px repeat(${daysInMonth}, minmax(60px, 1fr))` }}>
                        {/* Header */}
                        <div className="sticky left-0 bg-white dark:bg-gray-800 z-10 font-semibold p-2 border-b border-r dark:border-gray-700">Cabaña</div>
                        {days.map(day => (
                            <div key={day} className="text-center font-semibold p-2 border-b dark:border-gray-700">{day}</div>
                        ))}
                        
                        {/* Body */}
                        {allCabins.map((cabin, cabinIndex) => (
                            <React.Fragment key={cabin.id}>
                                <div className={`sticky left-0 z-10 font-medium p-2 border-r dark:border-gray-700 ${cabinIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-700'}`}>{cabin.name}</div>
                                {days.map(day => {
                                    const bookingOnThisDay = bookings.find(b => {
                                        const checkIn = new Date(b.checkIn);
                                        const checkOut = new Date(b.checkOut);
                                        checkIn.setHours(0,0,0,0);
                                        checkOut.setHours(0,0,0,0);
                                        const currentDayStart = new Date(year, month, day);
                                        return b.cabinId === cabin.id && currentDayStart >= checkIn && currentDayStart < checkOut;
                                    });

                                    const isStart = bookingOnThisDay && new Date(year, month, day).getTime() === new Date(bookingOnThisDay.checkIn).getTime();

                                    return (
                                        <div key={day} className={`border-b dark:border-gray-700 relative ${cabinIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}`}>
                                            {bookingOnThisDay && (
                                                <div 
                                                    onClick={() => openModal(bookingOnThisDay)}
                                                    className={`h-full flex items-center text-xs cursor-pointer whitespace-nowrap overflow-hidden ${isStart ? 'pl-2' : ''}`} 
                                                    style={{backgroundColor: bookingOnThisDay.season === 'high' ? (darkMode ? '#be185d' : '#fbcfe8') : (darkMode ? '#3b82f6' : '#bfdbfe')}}
                                                    title={bookingOnThisDay.guestName}
                                                >
                                                    {isStart && 
                                                        <span className="font-semibold text-black dark:text-white">
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
    
    const BookingListView = () => {
        const sortedBookings = [...bookings].sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

        return (
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Listado de Reservas</h3>
                    <button onClick={exportMonthlyBookingsPDF} className="flex items-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition">
                        <Download size={18}/>
                        <span>Exportar Mes</span>
                    </button>
                </div>
                {/* Table ... */}
            </div>
        );
    };

    const DashboardView = () => { /* ... */ return <div/> };

    return (
        <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300`}>
            {/* Modals and Header ... */}
            <main className="container mx-auto p-4 md:p-6">
                {/* View toggler ... */}
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

