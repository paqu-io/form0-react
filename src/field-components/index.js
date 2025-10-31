import { TextFieldComponent } from './text-field.jsx';
import { NumericFieldComponent } from './numeric-field.jsx';
import { CalculatedFieldComponent } from './calculated-field.jsx';

export { TextFieldComponent, NumericFieldComponent, CalculatedFieldComponent };

export const defaultFieldComponents = {
  TextField: TextFieldComponent,
  NumericField: NumericFieldComponent,
  CalculatedField: CalculatedFieldComponent,
};
