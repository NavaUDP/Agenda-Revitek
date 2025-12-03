import { useState } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameMonth, isBefore, parseISO, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BookingCalendarProps {
    selectedDate: string;
    onSelectDate: (isoDate: string) => void;
    minDate: string;
}

export function BookingCalendar({ selectedDate, onSelectDate, minDate }: BookingCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

    const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
    const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = monthStart; // We can adjust to start from Monday if needed, but let's keep it simple for now or match previous logic
    const endDate = monthEnd;

    // To fill the grid, we might want to show days from prev/next month
    // The previous implementation showed full weeks.
    // Let's replicate that: find the first day of the week for monthStart

    // 0 = Sunday, 1 = Monday, ...
    const startDayOfWeek = getDay(monthStart);
    // If we want Monday as first day (1), we need to adjust. 
    // Let's assume Sunday (0) is first day as per previous implementation 'Dom', 'Lun'...

    const calendarDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    // Add padding days at start
    const paddingStart = Array.from({ length: startDayOfWeek }).map((_, i) => {
        const d = new Date(monthStart);
        d.setDate(d.getDate() - (startDayOfWeek - i));
        return d;
    });

    // Add padding days at end
    const endDayOfWeek = getDay(monthEnd);
    const paddingEnd = Array.from({ length: 6 - endDayOfWeek }).map((_, i) => {
        const d = new Date(monthEnd);
        d.setDate(d.getDate() + i + 1);
        return d;
    });

    const allDays = [...paddingStart, ...calendarDays, ...paddingEnd];
    const minDateObj = parseISO(minDate);

    return (
        <div className="p-4 bg-background rounded-md border border-border">
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-semibold capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </div>
                <Button variant="ghost" size="icon" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                    <div key={day} className="py-1">{day}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {allDays.map((day, idx) => {
                    const isoDate = format(day, 'yyyy-MM-dd');
                    const isSelected = isSameDay(day, parseISO(selectedDate));
                    const isDisabled = isBefore(day, minDateObj) && !isSameDay(day, minDateObj); // Allow minDate
                    const isCurrentMonth = isSameMonth(day, currentMonth);

                    return (
                        <button
                            key={`${isoDate}-${idx}`}
                            onClick={() => !isDisabled && onSelectDate(isoDate)}
                            disabled={isDisabled}
                            className={cn(
                                "p-2 rounded-md text-sm transition-colors",
                                !isCurrentMonth && "text-muted-foreground opacity-50",
                                isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                                !isSelected && !isDisabled && "hover:bg-muted",
                                isDisabled && "opacity-30 cursor-not-allowed line-through"
                            )}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
