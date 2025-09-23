import React, {forwardRef} from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({label, error, ...props}, ref) => {
    return (
      <div>
        <label className=''>
          {label}

          <input ref={ref} className='' {...props} />
        </label>

        {error && (<p className=''>{error}</p>)}

      </div>
    );
  }
);

FormInput.displayName = 'FormInput';
