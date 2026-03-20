import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  location: string; setLocation: (v: string) => void;
  startDate: string; setStartDate: (v: string) => void;
  startTime: string; setStartTime: (v: string) => void;
  endDate: string; setEndDate: (v: string) => void;
  endTime: string; setEndTime: (v: string) => void;
  allDay: boolean; setAllDay: (v: boolean) => void;
  isPublic: boolean; setIsPublic: (v: boolean) => void;
  canSetPublic: boolean;
  isEdit: boolean;
}

export default function EventFormDialog({
  title, setTitle, description, setDescription,
  location, setLocation,
  startDate, setStartDate, startTime, setStartTime,
  endDate, setEndDate, endTime, setEndTime,
  allDay, setAllDay, isPublic, setIsPublic,
  canSetPublic, isEdit,
}: Props) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Titel *</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Marktlager Wiesbaden" />
      </div>
      <div>
        <label className="text-sm font-medium">Ort</label>
        <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="z.B. Schlossplatz, Wiesbaden" />
      </div>
      <div>
        <label className="text-sm font-medium">Beschreibung</label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <input type="checkbox" id={`allDay-${isEdit ? 'edit' : 'create'}`} checked={allDay} onChange={e => setAllDay(e.target.checked)} className="rounded border-input" />
          <label htmlFor={`allDay-${isEdit ? 'edit' : 'create'}`} className="text-sm font-medium cursor-pointer">Ganztägig</label>
        </div>
        {canSetPublic && (
          <div className="flex items-center gap-2">
            <input type="checkbox" id={`isPublic-${isEdit ? 'edit' : 'create'}`} checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded border-input" />
            <label htmlFor={`isPublic-${isEdit ? 'edit' : 'create'}`} className="text-sm font-medium cursor-pointer">
              Öffentlich sichtbar
            </label>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Startdatum *</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        {!allDay && (
          <div>
            <label className="text-sm font-medium">Startzeit</label>
            <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium">Enddatum</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {!allDay && (
          <div>
            <label className="text-sm font-medium">Endzeit</label>
            <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );
}
