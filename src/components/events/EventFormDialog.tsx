import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
  organizerId?: string;
  setOrganizerId?: (v: string) => void;
  canChangeOrganizer?: boolean;
}

export default function EventFormDialog({
  title, setTitle, description, setDescription,
  location, setLocation,
  startDate, setStartDate, startTime, setStartTime,
  endDate, setEndDate, endTime, setEndTime,
  allDay, setAllDay, isPublic, setIsPublic,
  canSetPublic, isEdit,
  organizerId, setOrganizerId, canChangeOrganizer,
}: Props) {
  const { data: members = [] } = useQuery({
    queryKey: ["member_directory"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_member_directory");
      return (data || []).filter((m: any) => m.is_active).sort((a: any, b: any) => a.display_name.localeCompare(b.display_name));
    },
    enabled: !!canChangeOrganizer && isEdit,
  });

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="efd-title" className="text-sm font-medium">Titel *</label>
        <Input id="efd-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Marktlager Wiesbaden" />
      </div>
      <div>
        <label htmlFor="efd-location" className="text-sm font-medium">Ort</label>
        <Input id="efd-location" value={location} onChange={e => setLocation(e.target.value)} placeholder="z.B. Schlossplatz, Wiesbaden" />
      </div>
      <div>
        <label htmlFor="efd-description" className="text-sm font-medium">Beschreibung</label>
        <Textarea id="efd-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} />
      </div>
      {isEdit && canChangeOrganizer && setOrganizerId && organizerId && (
        <div>
          <label htmlFor="efd-organizer" className="text-sm font-medium">Organisator</label>
          <Select value={organizerId} onValueChange={setOrganizerId}>
            <SelectTrigger>
              <SelectValue placeholder="Organisator wählen" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m: any) => (
                <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
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
          <label htmlFor="efd-start-date" className="text-sm font-medium">Startdatum *</label>
          <Input id="efd-start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        {!allDay && (
          <div>
            <label htmlFor="efd-start-time" className="text-sm font-medium">Startzeit</label>
            <Input id="efd-start-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="efd-end-date" className="text-sm font-medium">Enddatum</label>
          <Input id="efd-end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        {!allDay && (
          <div>
            <label htmlFor="efd-end-time" className="text-sm font-medium">Endzeit</label>
            <Input id="efd-end-time" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );
}
