import { UIConfigField } from '@/lib/config/types';
import SettingsField from '../SettingsField';

const Personalization = ({
  fields,
  values,
}: {
  fields: UIConfigField[];
  values: Record<string, any>;
}) => {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-8 py-6">
      {fields.map((field) => (
        <SettingsField
          key={field.key}
          field={field}
          value={
            (field.scope === 'client'
              ? localStorage.getItem(field.key)
              : values[field.key]) ?? field.default
          }
          dataAdd="personalization"
        />
      ))}
    </div>
  );
};

export default Personalization;
