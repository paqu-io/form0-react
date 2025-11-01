import { TextFieldComponent } from './text-field.jsx';
import { NumericFieldComponent } from './numeric-field.jsx';
import { CalculatedFieldComponent } from './calculated-field.jsx';
import { SingleChoiceFieldComponent } from './single-choice-field.jsx';
import { BooleanFieldComponent } from './boolean-field.jsx';

export {
  TextFieldComponent,
  NumericFieldComponent,
  CalculatedFieldComponent,
  SingleChoiceFieldComponent,
  BooleanFieldComponent,
};

export const defaultFieldComponents = {
  TextField: TextFieldComponent,
  NumericField: NumericFieldComponent,
  CalculatedField: CalculatedFieldComponent,
  SingleChoiceField: SingleChoiceFieldComponent,
  BooleanField: BooleanFieldComponent,
};
