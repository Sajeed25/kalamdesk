// Plain GET form: filters live in the URL, so views are shareable and need no client state.
export default function Filters({
  people, departments, current,
}: {
  people: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  current: Record<string, string | undefined>;
}) {
  return (
    <form className="flex flex-wrap items-end gap-2">
      <label className="text-xs text-mute">Person
        <select name="person" defaultValue={current.person ?? ""} className="input mt-1 !w-40">
          <option value="">Everyone</option>
          {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>
      <label className="text-xs text-mute">Department
        <select name="dept" defaultValue={current.dept ?? ""} className="input mt-1 !w-36">
          <option value="">All</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </label>
      <label className="text-xs text-mute">Priority
        <select name="priority" defaultValue={current.priority ?? ""} className="input mt-1 !w-28">
          <option value="">All</option>
          {["P1", "P2", "P3", "P4"].map((p) => <option key={p}>{p}</option>)}
        </select>
      </label>
      <label className="text-xs text-mute">Tag
        <input name="tag" defaultValue={current.tag ?? ""} className="input mt-1 !w-28" placeholder="optional" />
      </label>
      <button className="btn">Apply</button>
    </form>
  );
}
