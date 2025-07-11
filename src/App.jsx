import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Users, DollarSign, BarChart2, Plus, Edit, Trash2, Moon, Sun, AlertCircle, CheckCircle, X, Info } from 'lucide-react';

// --- CONFIGURACIÓN ---
// En el Paso 1 de la guía, obtendrás esta configuración de tu propio proyecto de Firebase.
const firebaseConfig = {
    apiKey: "TU_API_KEY", // REEMPLAZAR
    authDomain: "TU_AUTH_DOMAIN", // REEMPLAZAR
    projectId: "TU_PROJECT_ID", // REEMPLAZAR
    storageBucket: "TU_STORAGE_BUCKET", // REEMPLAZAR
    messagingSenderId: "TU_MESSAGING_SENDER_ID", // REEMPLAZAR
    appId: "TU_APP_ID" // REEMPLAZAR
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
        <div className={`fixed top-5 right-5 max-w-sm w-full p-4 rounded-lg border-l-4 shadow-lg ${bgColor} ${borderColor} ${textColor}`} role="alert">
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
    const [view, setView] = useState('calendar'); // 'calendar' o 'dashboard'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [darkMode, setDarkMode] = useState(false);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ isOpen: false, bookingId: null });

    // --- EFECTOS ---
    useEffect(() => {
        // Autenticación de Firebase
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
        // Suscripción a los datos de Firestore
        if (!isAuthReady || !auth.currentUser) return;
        
        const q = query(collection(db, "reservations"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const bookingsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBookings(bookingsData);
        }, (error) => {
            console.error("Error fetching bookings:", error);
            setNotification({ message: 'Error al cargar las reservas.', type: 'error' });
        });

        return () => unsubscribe();
    }, [isAuthReady]);

    useEffect(() => {
        // Manejo del modo oscuro
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [darkMode]);

    // --- LÓGICA DE NEGOCIO ---

    const calculateTotalCost = (adults, children, checkIn, checkOut) => {
        if (!checkIn || !checkOut) return 0;
        const nights = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
        if (nights <= 0) return 0;
        const cost = (Number(adults) * PRICING_CONFIG.adult + Number(children) * PRICING_CONFIG.child) * nights;
        return cost;
    };

    const checkAvailability = async (cabinType, cabinId, checkIn, checkOut, excludingBookingId = null) => {
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
            const isAvailable = await checkAvailability(cabinType, cabinId, checkIn, checkOut, excludingBookingId);
            if (isAvailable) {
                return cabinId;
            }
        }
        return null; 
    };

    // --- MANEJADORES DE EVENTOS ---
    const handleSaveBooking = async (formData) => {
        if (!formData.guestName || !formData.checkIn || !formData.checkOut || !formData.cabinType) {
            setNotification({ message: 'Por favor, complete todos los campos requeridos.', type: 'error' });
            return;
        }
        if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
            setNotification({ message: 'La fecha de salida debe ser posterior a la fecha de entrada.', type: 'error' });
            return;
        }
        const totalGuests = Number(formData.adults) + Number(formData.children) + Number(formData.toddlers);
        if (totalGuests === 0) {
            setNotification({ message: 'Debe haber al menos un huésped.', type: 'error' });
            return;
        }
        if (totalGuests > CABIN_CONFIG[formData.cabinType].capacity) {
            setNotification({ message: `La capacidad máxima para la ${CABIN_CONFIG[formData.cabinType].name} es de ${CABIN_CONFIG[formData.cabinType].capacity} personas.`, type: 'error' });
            return;
        }

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
                totalCost: calculateTotalCost(formData.adults, formData.children, formData.checkIn, formData.checkOut),
                cabinId: availableCabinId,
                updatedAt: new Date().toISOString(),
            };

            if (editingBooking) {
                const bookingRef = doc(db, 'reservations', editingBooking.id);
                await updateDoc(bookingRef, bookingData);
                setNotification({ message: 'Reserva actualizada con éxito.', type: 'success' });
            } else {
                bookingData.createdAt = new Date().toISOString();
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

    const openModal = (booking = null) => {
        setEditingBooking(booking);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingBooking(null);
    };
    
    const openDeleteConfirmation = (bookingId) => {
        setDeleteConfirmation({ isOpen: true, bookingId });
    };

    const closeDeleteConfirmation = () => {
        setDeleteConfirmation({ isOpen: false, bookingId: null });
    };

    const changeMonth = (offset) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + offset);
            return newDate;
        });
    };

    // --- RENDERIZADO DE COMPONENTES ---

    const BookingFormModal = () => {
        const initialFormData = {
            guestName: '',
            checkIn: '',
            checkOut: '',
            adults: 1,
            children: 0,
            toddlers: 0,
            cabinType: 'pequena',
            depositPaid: false,
            depositAmount: 0,
        };
        const [formData, setFormData] = useState(editingBooking || initialFormData);

        useEffect(() => {
            if (editingBooking) {
                setFormData(editingBooking);
            } else {
                setFormData(initialFormData);
            }
        }, [editingBooking]);

        const handleChange = (e) => {
            const { name, value, type, checked } = e.target;
            setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
        };

        const handleSubmit = (e) => {
            e.preventDefault();
            handleSaveBooking(formData);
        };

        const totalCost = calculateTotalCost(formData.adults, formData.children, formData.checkIn, formData.checkOut);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40 overflow-y-auto p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl max-w-lg w-full">
                    <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">{editingBooking ? 'Editar Reserva' : 'Nueva Reserva'}</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nombre del Huésped</label>
                            <input type="text" name="guestName" value={formData.guestName} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Check-in</label>
                                <input type="date" name="checkIn" value={formData.checkIn} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Check-out</label>
                                <input type="date" name="checkOut" value={formData.checkOut} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Adultos (16+)</label>
                                <input type="number" name="adults" min="0" value={formData.adults} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Niños (8-15)</label>
                                <input type="number" name="children" min="0" value={formData.children} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Infantes (0-7)</label>
                                <input type="number" name="toddlers" min="0" value={formData.toddlers} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Cabaña</label>
                            <select name="cabinType" value={formData.cabinType} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500">
                                {Object.entries(CABIN_CONFIG).map(([key, { name }]) => (
                                    <option key={key} value={key}>{name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                            <div className="flex items-center">
                                <input id="depositPaid" name="depositPaid" type="checkbox" checked={formData.depositPaid} onChange={handleChange} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor="depositPaid" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Abono Realizado</label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Monto Abonado</label>
                                <input type="number" name="depositAmount" min="0" value={formData.depositAmount} onChange={handleChange} disabled={!formData.depositPaid} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 disabled:bg-gray-200 dark:disabled:bg-gray-600" />
                            </div>
                        </div>
                        <div className="pt-4 text-right">
                            <p className="text-lg font-semibold text-gray-800 dark:text-white">Total a Pagar: ${totalCost.toLocaleString('es-CL')}</p>
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

    const CalendarView = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

        const getBookingsForDay = (day) => {
            const date = new Date(year, month, day);
            date.setHours(0,0,0,0);
            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);

            return bookings.filter(b => {
                const checkIn = new Date(b.checkIn);
                const checkOut = new Date(b.checkOut);
                return checkIn < nextDay && checkOut > date;
            });
        };

        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&lt;</button>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                        {currentDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                    </h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 dark:text-gray-400">
                    {weekdays.map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 mt-2">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                    {days.map(day => {
                        const dayBookings = getBookingsForDay(day);
                        const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
                        return (
                            <div key={day} className="border dark:border-gray-700 rounded-md p-2 h-28 flex flex-col">
                                <div className={`font-bold ${isToday ? 'bg-indigo-500 text-white rounded-full w-7 h-7 flex items-center justify-center' : 'text-gray-800 dark:text-gray-200'}`}>{day}</div>
                                <div className="mt-1 overflow-y-auto text-xs space-y-1">
                                    {dayBookings.map(b => (
                                        <div key={b.id} onClick={() => openModal(b)} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 p-1 rounded cursor-pointer truncate">
                                            {b.guestName} ({b.cabinType.charAt(0).toUpperCase()})
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };
    
    const BookingListView = () => {
        const sortedBookings = [...bookings].sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));

        return (
            <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Listado de Reservas</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th scope="col" className="px-6 py-3">Huésped</th>
                                <th scope="col" className="px-6 py-3">Fechas</th>
                                <th scope="col" className="px-6 py-3">Cabaña</th>
                                <th scope="col" className="px-6 py-3">Total</th>
                                <th scope="col" className="px-6 py-3">Abono</th>
                                <th scope="col" className="px-6 py-3">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedBookings.map(b => (
                                <tr key={b.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{b.guestName}</td>
                                    <td className="px-6 py-4">{new Date(b.checkIn).toLocaleDateString('es-CL')} - {new Date(b.checkOut).toLocaleDateString('es-CL')}</td>
                                    <td className="px-6 py-4">{CABIN_CONFIG[b.cabinType].name} ({b.cabinId})</td>
                                    <td className="px-6 py-4">${b.totalCost.toLocaleString('es-CL')}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${b.depositPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {b.depositPaid ? `Sí ($${b.depositAmount.toLocaleString('es-CL')})` : 'No'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex space-x-2">
                                        <button onClick={() => openModal(b)} className="p-1 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"><Edit size={18} /></button>
                                        <button onClick={() => openDeleteConfirmation(b.id)} className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"><Trash2 size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const DashboardView = () => {
        const totalRevenue = bookings.reduce((acc, b) => acc + b.totalCost, 0);
        const totalPaid = bookings.filter(b => b.depositPaid).reduce((acc, b) => acc + b.depositAmount, 0);
        const occupancyByCabin = Object.keys(CABIN_CONFIG).reduce((acc, key) => {
            acc[key] = bookings.filter(b => b.cabinType === key).length;
            return acc;
        }, {});

        const chartData = Object.entries(occupancyByCabin).map(([name, value]) => ({
            name: CABIN_CONFIG[name].name,
            reservas: value,
        }));

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={<DollarSign className="h-6 w-6 text-white"/>} title="Ingresos Totales" value={`$${totalRevenue.toLocaleString('es-CL')}`} color="bg-green-500" />
                    <StatCard icon={<DollarSign className="h-6 w-6 text-white"/>} title="Total Abonado" value={`$${totalPaid.toLocaleString('es-CL')}`} color="bg-blue-500" />
                    <StatCard icon={<Users className="h-6 w-6 text-white"/>} title="Reservas Activas" value={bookings.length} color="bg-yellow-500" />
                    <StatCard icon={<Info className="h-6 w-6 text-white"/>} title="ID de Sesión" value={userId ? `...${userId.slice(-6)}` : 'N/A'} color="bg-purple-500" />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Reservas por Tipo de Cabaña</h3>
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
            <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
            {isModalOpen && <BookingFormModal />}
            <ConfirmationModal 
                isOpen={deleteConfirmation.isOpen}
                title="Confirmar Eliminación"
                message="¿Estás seguro de que quieres eliminar esta reserva? Esta acción no se puede deshacer."
                onConfirm={() => handleDeleteBooking(deleteConfirmation.bookingId)}
                onCancel={closeDeleteConfirmation}
            />

            <header className="bg-white dark:bg-gray-800 shadow-md">
                <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Gestión de Cabañas</h1>
                    <div className="flex items-center space-x-4">
                        <button onClick={() => openModal()} className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition">
                            <Plus size={20} />
                            <span>Nueva Reserva</span>
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
                        <CalendarView />
                        <BookingListView />
                    </div>
                ) : (
                    <DashboardView />
                )}
            </main>
        </div>
    );
}


