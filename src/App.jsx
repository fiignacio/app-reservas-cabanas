import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, arrayUnion } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Calendar, Users, DollarSign, BarChart2, Plus, Edit, Trash2, Moon, Sun, AlertCircle, CheckCircle, X, Info, ChevronLeft, ChevronRight, Lock, LockOpen, Car, Plane, ClipboardList, FileText, Download, Archive, Bell, Mail, MessageSquare } from 'lucide-react';

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


// **INSTRUCCIÓN**: Reemplaza la siguiente cadena de texto con la versión Base64 de tu propio logo.
const LOGO_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="; // Logo de 1x1 pixel como placeholder

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

    // Helper para parsear fechas sin problemas de timezone
    const parseDateAsLocal = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const { activeBookings, archivedBookings, upcomingArrivals } = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const active = [];
        const archived = [];

        allBookings.forEach(booking => {
            const checkOutDate = parseDateAsLocal(booking.checkOut);
            if (checkOutDate < today) {
                archived.push(booking);
            } else {
                active.push(booking);
            }
        });

        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(today.getDate() + 2);

        const arrivals = active.filter(b => {
            const checkInDate = parseDateAsLocal(b.checkIn);
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
        const checkInDate = parseDateAsLocal(checkIn);
        const checkOutDate = parseDateAsLocal(checkOut);
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
                if (parseDateAsLocal(checkIn) < parseDateAsLocal(b.checkOut) && parseDateAsLocal(checkOut) > parseDateAsLocal(b.checkIn)) {
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
        if (!formData.guestName || !formData.checkIn || !formData.checkOut || !formData.cabinType) {
            setNotification({ message: 'Por favor, complete todos los campos requeridos.', type: 'error' });
            return;
        }
        
        try {
            const availableCabinId = await findAvailableCabinId(formData.cabinType, formData.checkIn, formData.checkOut, editingBooking ? editingBooking.id : null);

            if (!availableCabinId) {
                setNotification({ message: `No hay ${CABIN_CONFIG[formData.cabinType].name}s disponibles para las fechas seleccionadas.`, type: 'error' });
                return;
            }

            const bookingData = {
                guestName: formData.guestName,
                checkIn: formData.checkIn,
                checkOut: formData.checkOut,
                adults: Number(formData.adults),
                children: Number(formData.children),
                toddlers: Number(formData.toddlers),
                cabinType: formData.cabinType,
                depositPaid: formData.depositPaid,
                depositAmount: Number(formData.depositAmount),
                totalCost: isPriceOverridden ? Number(formData.totalCost) : calculateTotalCost(formData.adults, formData.children, formData.checkIn, formData.checkOut, formData.season),
                isPriceOverridden: isPriceOverridden,
                hasVehicle: formData.hasVehicle,
                arrivalFlight: formData.arrivalFlight,
                departureFlight: formData.departureFlight,
                season: formData.season,
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
        setDeleteConfirmation({ isOpen: false, bookingId: null });
        try {
            await deleteDoc(doc(db, "reservations", bookingId));
            setNotification({ message: 'Reserva eliminada correctamente.', type: 'success' });
        } catch (error) {
            console.error("Error deleting booking: ", error);
            setNotification({ message: 'No se pudo eliminar la reserva.', type: 'error' });
        }
    };
    
    const handleAddEvent = async (bookingId, eventText) => {
        if (!eventText.trim()) {
            setNotification({ message: 'El evento no puede estar vacío.', type: 'error' });
            return;
        }
        const bookingRef = doc(db, "reservations", bookingId);
        const newEvent = {
            text: eventText,
            timestamp: new Date().toISOString(),
        };
        try {
            await updateDoc(bookingRef, {
                events: arrayUnion(newEvent)
            });
            setNotification({ message: 'Evento agregado.', type: 'success' });
        } catch (error) {
            console.error("Error adding event:", error);
            setNotification({ message: 'No se pudo agregar el evento.', type: 'error' });
        }
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

    // --- PDF Generation ---
    const exportMonthlyBookingsPDF = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        const monthlyBookings = activeBookings.filter(b => {
            const checkIn = parseDateAsLocal(b.checkIn);
            return checkIn.getFullYear() === year && checkIn.getMonth() === month;
        }).sort((a, b) => parseDateAsLocal(a.checkIn) - parseDateAsLocal(b.checkIn));

        if (monthlyBookings.length === 0) {
            setNotification({ message: 'No hay reservas activas para exportar en el mes seleccionado.', type: 'error' });
            return;
        }

        const doc = new jsPDF();
        const monthName = currentDate.toLocaleString('es-CL', { month: 'long' });
        const title = `Reporte de Reservas - ${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
        
        if (LOGO_BASE64 && LOGO_BASE64.startsWith('data:image')) {
            doc.addImage(LOGO_BASE64, 'PNG', 14, 10, 40, 15);
        }
        
        doc.setFontSize(18);
        doc.text(title, 105, 22, { align: 'center' });
        doc.setFontSize(11);

        const head = [['Huésped', 'Check-in', 'Check-out', 'Cabaña', 'Pasajeros', 'Total', 'Temporada']];
        const body = monthlyBookings.map(b => [
            b.guestName,
            parseDateAsLocal(b.checkIn).toLocaleDateString('es-CL'),
            parseDateAsLocal(b.checkOut).toLocaleDateString('es-CL'),
            `${CABIN_CONFIG[b.cabinType].name} #${b.cabinId.split('-')[1]}`,
            (b.adults || 0) + (b.children || 0) + (b.toddlers || 0),
            `$${b.totalCost.toLocaleString('es-CL')}`,
            b.season === 'high' ? 'Alta' : 'Baja'
        ]);

        doc.autoTable({
            head: head,
            body: body,
            startY: 40,
            theme: 'grid',
            headStyles: { fillColor: [22, 160, 133] },
        });
        
        doc.save(`Reporte_Reservas_${monthName}_${year}.pdf`);
    };
    
    // --- RENDERIZADO DE COMPONENTES ---

    const QuoteModal = () => {
        const [quoteData, setQuoteData] = useState({
            checkIn: '', checkOut: '', adults: 1, children: 0, cabinType: 'pequena', season: 'low'
        });
        const [result, setResult] = useState(null);

        const handleChange = (e) => {
            const { name, value, type, checked } = e.target;
            const val = type === 'checkbox' ? (checked ? 'high' : 'low') : value;
            setQuoteData(prev => ({ ...prev, [name]: val }));
            setResult(null); // Reset result on change
        };

        const handleQuote = () => {
            if (!quoteData.checkIn || !quoteData.checkOut) {
                setNotification({message: 'Por favor, ingrese fechas de check-in y check-out.', type: 'error'});
                return;
            }
            const totalCost = calculateTotalCost(quoteData.adults, quoteData.children, quoteData.checkIn, quoteData.checkOut, quoteData.season);
            const nights = Math.ceil((parseDateAsLocal(quoteData.checkOut) - parseDateAsLocal(quoteData.checkIn)) / (1000 * 60 * 60 * 24));
            setResult({ ...quoteData, totalCost, nights });
        };

        const handleGeneratePDF = () => {
            if (!result) return;
            const doc = new jsPDF();
            
            if (LOGO_BASE64 && LOGO_BASE64.startsWith('data:image')) {
                doc.addImage(LOGO_BASE64, 'PNG', 14, 10, 40, 15);
            }
            
            doc.setFontSize(22);
            doc.setTextColor(40);
            doc.text("Cotización de Estadía", 105, 22, { align: 'center' });

            doc.autoTable({
                body: [
                    ['Check-in:', parseDateAsLocal(result.checkIn).toLocaleDateString('es-CL')],
                    ['Check-out:', parseDateAsLocal(result.checkOut).toLocaleDateString('es-CL')],
                    ['Noches:', result.nights],
                    ['Cabaña:', CABIN_CONFIG[result.cabinType].name],
                    ['Huéspedes:', `${result.adults} Adulto(s), ${result.children} Niño(s)`],
                    ['Temporada:', result.season === 'high' ? 'Alta' : 'Baja'],
                ],
                startY: 40,
                theme: 'plain',
                styles: { fontSize: 12 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 }, 1: { cellWidth: 'auto'} }
            });

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
                        <div className="flex items-center">
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
            let val = value;
            if (type === 'checkbox') {
                if (name === 'season') {
                    val = checked ? 'high' : 'low';
                } else {
                    val = checked;
                }
            }
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
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Huésped</label>
                            <input type="text" name="guestName" value={formData.guestName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Check-in</label>
                                <input type="date" name="checkIn" value={formData.checkIn} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Check-out</label>
                                <input type="date" name="checkOut" value={formData.checkOut} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adultos (16+)</label>
                                <input type="number" name="adults" min="0" value={formData.adults} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Niños (8-15)</label>
                                <input type="number" name="children" min="0" value={formData.children} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Infantes (0-7)</label>
                                <input type="number" name="toddlers" min="0" value={formData.toddlers} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm" />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Cabaña</label>
                                <select name="cabinType" value={formData.cabinType} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm">
                                    {Object.entries(CABIN_CONFIG).map(([key, { name }]) => (
                                        <option key={key} value={key}>{name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center pt-6">
                                <input id="season_booking" name="season" type="checkbox" checked={formData.season === 'high'} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="season_booking" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Temporada Alta</label>
                            </div>
                        </div>
                        
                        <div className="border-t dark:border-gray-600 pt-4">
                            <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Logística Adicional</h3>
                            <div className="space-y-4">
                                <div className="flex items-center">
                                    <input id="hasVehicle" name="hasVehicle" type="checkbox" checked={formData.hasVehicle || false} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                    <label htmlFor="hasVehicle" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Arrienda Vehículo</label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vuelo de Llegada</label>
                                        <input type="text" name="arrivalFlight" value={formData.arrivalFlight || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vuelo de Salida</label>
                                        <input type="text" name="departureFlight" value={formData.departureFlight || ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t dark:border-gray-600 pt-4">
                            <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Información de Pago</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div className="flex items-center">
                                    <input id="depositPaid" name="depositPaid" type="checkbox" checked={formData.depositPaid} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                    <label htmlFor="depositPaid" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Abono Realizado</label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto Abonado</label>
                                    <input type="number" name="depositAmount" min="0" value={formData.depositAmount} onChange={handleChange} disabled={!formData.depositPaid} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm disabled:bg-gray-200 dark:disabled:bg-gray-600" />
                                </div>
                            </div>
                            <div className="pt-4 space-y-2">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="override" className="flex items-center cursor-pointer">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-3">Editar Total (Descuento)</span>
                                    </label>
                                    <div className="relative">
                                        <input type="checkbox" id="override" className="sr-only" checked={isPriceOverridden} onChange={() => setIsPriceOverridden(!isPriceOverridden)} />
                                        <div className="dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition"></div>
                                        <div className="block bg-gray-200 dark:bg-gray-600 w-14 h-8 rounded-full"></div>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <span className="text-lg font-semibold text-gray-800 dark:text-white mr-2">Total a Pagar: $</span>
                                    <input 
                                        type="number" 
                                        name="totalCost" 
                                        value={formData.totalCost} 
                                        onChange={handleChange} 
                                        disabled={!isPriceOverridden} 
                                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm disabled:bg-gray-200 dark:disabled:bg-gray-600 text-lg font-semibold" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={closeModal} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Guardar Reserva</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };
    
    const EventLogModal = () => {
        const { isOpen, booking } = eventLogModal;
        const [newEventText, setNewEventText] = useState('');
        
        if (!isOpen || !booking) return null;

        const sortedEvents = [...booking.events].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));

        const handleFormSubmit = (e) => {
            e.preventDefault();
            handleAddEvent(booking.id, newEventText);
            setNewEventText('');
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-lg w-full">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Bitácora de: {booking.guestName}</h2>
                        <button onClick={closeEventLogModal} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X/></button>
                    </div>
                    <div className="space-y-4">
                        <form onSubmit={handleFormSubmit} className="flex space-x-2">
                            <input 
                                type="text" 
                                value={newEventText}
                                onChange={(e) => setNewEventText(e.target.value)}
                                placeholder="Añadir nuevo evento..."
                                className="flex-grow block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm"
                            />
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Añadir</button>
                        </form>
                        <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                            {sortedEvents.length > 0 ? sortedEvents.map((event, index) => (
                                <div key={index} className="p-3 rounded-md bg-gray-50 dark:bg-gray-700/50">
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{event.text}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {new Date(event.timestamp).toLocaleString('es-CL')}
                                    </p>
                                </div>
                            )) : (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No hay eventos registrados.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

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
                                    const currentDayDate = new Date(year, month, day);
                                    
                                    const checkInBooking = bookingsToDisplay.find(b => b.cabinId === cabin.id && parseDateAsLocal(b.checkIn).getTime() === currentDayDate.getTime());
                                    const checkOutBooking = bookingsToDisplay.find(b => b.cabinId === cabin.id && parseDateAsLocal(b.checkOut).getTime() === currentDayDate.getTime());
                                    const ongoingBooking = bookingsToDisplay.find(b => b.cabinId === cabin.id && parseDateAsLocal(b.checkIn) < currentDayDate && parseDateAsLocal(b.checkOut) > currentDayDate);
                                    
                                    const bookingForCell = checkInBooking || ongoingBooking;
                                    const colorSet = bookingForCell ? CABIN_CONFIG[bookingForCell.cabinType].color[bookingForCell.season || 'low'] : null;

                                    return (
                                        <div key={day} className={`border-b dark:border-gray-700 relative h-12 ${cabinIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}`}>
                                            {checkOutBooking && (
                                                <div className="absolute top-0 left-0 w-full h-1/2 bg-gray-400/50 dark:bg-gray-600/50" title={`Salida: ${checkOutBooking.guestName}`}></div>
                                            )}
                                            {bookingForCell && (
                                                <div 
                                                    onClick={() => openModal(bookingForCell)}
                                                    className={`absolute inset-0 cursor-pointer border-2 border-white dark:border-gray-800 
                                                        ${checkInBooking && checkOutBooking ? 'top-1/2 h-1/2' : ''}
                                                        ${checkInBooking ? 'rounded-l-lg' : ''}
                                                        ${parseDateAsLocal(bookingForCell.checkOut).getTime() === new Date(year, month, day + 1).getTime() ? 'rounded-r-lg' : ''}
                                                    `}
                                                    style={{backgroundColor: darkMode ? colorSet.dark : colorSet.light}}
                                                    title={bookingForCell.guestName}
                                                >
                                                    {checkInBooking && 
                                                        <div className="absolute inset-0 flex items-center pl-2 overflow-hidden">
                                                            <span className="font-semibold truncate text-xs" style={{color: darkMode ? '#fff' : '#000', textShadow: '1px 1px 2px rgba(0,0,0,0.2)'}}>
                                                                {bookingForCell.guestName} ({ (bookingForCell.adults || 0) + (bookingForCell.children || 0) + (bookingForCell.toddlers || 0) }p)
                                                            </span>
                                                        </div>
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
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Huésped</th>
                                <th scope="col" className="px-6 py-3">Check-in</th>
                                <th scope="col" className="px-6 py-3">Check-out</th>
                                <th scope="col" className="px-6 py-3">Cabaña</th>
                                <th scope="col" className="px-6 py-3">Total</th>
                                <th scope="col" className="px-6 py-3">Abono</th>
                                <th scope="col" className="px-6 py-3">Logística</th>
                                <th scope="col" className="px-6 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedBookings.map(b => (
                                <tr key={b.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{b.guestName}</td>
                                    <td className="px-6 py-4">{new Date(b.checkIn).toLocaleDateString('es-CL')}</td>
                                    <td className="px-6 py-4">{new Date(b.checkOut).toLocaleDateString('es-CL')}</td>
                                    <td className="px-6 py-4">{CABIN_CONFIG[b.cabinType].name} ({b.cabinId})</td>
                                    <td className="px-6 py-4 flex items-center">
                                        ${b.totalCost.toLocaleString('es-CL')}
                                        {b.isPriceOverridden && <Info size={14} className="ml-2 text-blue-500" title="Precio modificado manualmente"/>}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${b.depositPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {b.depositPaid ? `Sí ($${b.depositAmount.toLocaleString('es-CL')})` : 'No'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center space-x-2">
                                            {b.hasVehicle && <Car size={18} className="text-gray-600 dark:text-gray-300" title="Vehículo arrendado"/>}
                                            {(b.arrivalFlight || b.departureFlight) && <Plane size={18} className="text-gray-600 dark:text-gray-300" title={`Llegada: ${b.arrivalFlight || 'N/A'} / Salida: ${b.departureFlight || 'N/A'}`}/>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 flex space-x-2">
                                        <button onClick={() => openEventLogModal(b)} className="p-1 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200" title="Bitácora de Eventos"><ClipboardList size={18} /></button>
                                        <button onClick={() => openModal(b)} className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200" title="Editar Reserva"><Edit size={18} /></button>
                                        <button onClick={() => openDeleteConfirmation(b.id)} className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200" title="Eliminar Reserva"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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

    const DashboardView = () => {
        const totalRevenue = activeBookings.reduce((acc, b) => acc + b.totalCost, 0);
        const totalPaid = activeBookings.filter(b => b.depositPaid).reduce((acc, b) => acc + b.depositAmount, 0);
        const occupancyByCabin = Object.keys(CABIN_CONFIG).reduce((acc, key) => {
            acc[key] = activeBookings.filter(b => b.cabinType === key).length;
            return acc;
        }, {});

        const chartData = Object.entries(occupancyByCabin).map(([name, value]) => ({
            name: CABIN_CONFIG[name].name,
            reservas: value,
        }));

        return (
            <div className="space-y-6">
                <AlertsPanel arrivals={upcomingArrivals} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={<DollarSign className="h-6 w-6 text-white"/>} title="Ingresos (Reservas Activas)" value={`$${totalRevenue.toLocaleString('es-CL')}`} color="bg-green-500" />
                    <StatCard icon={<DollarSign className="h-6 w-6 text-white"/>} title="Abonado (Reservas Activas)" value={`$${totalPaid.toLocaleString('es-CL')}`} color="bg-blue-500" />
                    <StatCard icon={<Users className="h-6 w-6 text-white"/>} title="Reservas Activas" value={activeBookings.length} color="bg-yellow-500" />
                    <StatCard icon={<Archive className="h-6 w-6 text-white"/>} title="Reservas Archivadas" value={archivedBookings.length} color="bg-purple-500" />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Ocupación Actual por Tipo de Cabaña</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                                <XAxis dataKey="name" className="text-xs fill-current text-gray-600 dark:text-gray-400" />
                                <YAxis className="text-xs fill-current text-gray-600 dark:text-gray-400" />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: darkMode ? '#374151' : '#ffffff',
                                        borderColor: darkMode ? '#4b5563' : '#e5e7eb'
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="reservas" fill="#4f46e5" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        );
    };

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
                    <div className="flex items-center">
                        <img src={LOGO_BASE64} alt="Logo" className="h-10 mr-4" />
                        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Mis Cabañas</h1>
                    </div>
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
                    <DashboardView />
                )}
            </main>
        </div>
    );
}
