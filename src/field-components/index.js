import { TextFieldComponent } from './text-field.jsx';
import { NumericFieldComponent } from './numeric-field.jsx';
import { CalculatedFieldComponent } from './calculated-field.jsx';
import { SingleChoiceFieldComponent } from './single-choice-field.jsx';
import { BooleanFieldComponent } from './boolean-field.jsx';
import { MultiChoiceFieldComponent } from './multi-choice-field.jsx';
import { DateFieldComponent } from './date-field.jsx';
import { TimeFieldComponent } from './time-field.jsx';
import { LabelFieldComponent } from './label-field.jsx';
import { TitleFieldComponent } from './title-field.jsx';
import { StatusFieldComponent } from './status-field.jsx';
import { PhotoFieldComponent } from './photo-field.jsx';
import { SignatureFieldComponent } from './signature-field.jsx';
import { VideoFieldComponent } from './video-field.jsx';

export {
  TextFieldComponent,
  NumericFieldComponent,
  CalculatedFieldComponent,
  SingleChoiceFieldComponent,
  BooleanFieldComponent,
  MultiChoiceFieldComponent,
  DateFieldComponent,
  TimeFieldComponent,
  LabelFieldComponent,
  TitleFieldComponent,
  StatusFieldComponent,
  PhotoFieldComponent,
  SignatureFieldComponent,
  VideoFieldComponent,
};

export const defaultFieldComponents = {
  TextField: TextFieldComponent,
  NumericField: NumericFieldComponent,
  CalculatedField: CalculatedFieldComponent,
  SingleChoiceField: SingleChoiceFieldComponent,
  BooleanField: BooleanFieldComponent,
  MultiChoiceField: MultiChoiceFieldComponent,
  DateField: DateFieldComponent,
  TimeField: TimeFieldComponent,
  LabelField: LabelFieldComponent,
  TitleField: TitleFieldComponent,
  StatusField: StatusFieldComponent,
  PhotoField: PhotoFieldComponent,
  SignatureField: SignatureFieldComponent,
  VideoField: VideoFieldComponent,
};
