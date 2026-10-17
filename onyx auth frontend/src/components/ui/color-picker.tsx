import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Range, Root, Thumb, Track } from '@radix-ui/react-slider';
import Color from 'color';
import { PipetteIcon } from 'lucide-react';
import {
  type ChangeEventHandler,
  type ComponentProps,
  type HTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { createContext, useContext } from 'react';

interface ColorPickerContextValue {
  hue: number;
  saturation: number;
  brightness: number;
  setHue: (hue: number) => void;
  setSaturation: (saturation: number) => void;
  setBrightness: (brightness: number) => void;
}

const ColorPickerContext = createContext<ColorPickerContextValue | undefined>(
  undefined
);

export const useColorPicker = () => {
  const context = useContext(ColorPickerContext);

  if (!context) {
    throw new Error('useColorPicker must be used within a ColorPickerProvider');
  }

  return context;
};

export type ColorPickerProps = HTMLAttributes<HTMLDivElement> & {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
};

export const ColorPicker = ({
  value,
  defaultValue = '#8b5cf6',
  onChange,
  className,
  ...props
}: ColorPickerProps) => {
  const selectedColor = Color(value || defaultValue);
  const defaultColor = Color(defaultValue);

  const [hue, setHue] = useState(
    selectedColor.hue() || defaultColor.hue() || 0
  );
  const [saturation, setSaturation] = useState(
    selectedColor.saturationv() || defaultColor.saturationv() || 100
  );
  const [brightness, setBrightness] = useState(
    selectedColor.value() || defaultColor.value() || 100
  );

  const lastHex = useRef<string | undefined>(value || defaultValue);
  const recentEmissions = useRef<Set<string>>(new Set());

  // Update color HSV values when controlled color value changes
  useEffect(() => {
    if (value) {
      const hex = value.toLowerCase();
      // Ignore echoes from our own recent emissions to prevent cursor jumping
      if (recentEmissions.current.has(hex)) {
        return;
      }
      try {
        const color = Color(value);
        setHue(color.hue() || 0);
        setSaturation(color.saturationv() || 100);
        setBrightness(color.value() || 100);
        lastHex.current = color.hex();
      } catch (e) {
        console.error('Error parsing value in ColorPicker:', e);
      }
    }
  }, [value]);

  // Notify parent of changes with Hex string
  useEffect(() => {
    if (onChange) {
      try {
        const color = Color.hsv(hue, saturation, brightness);
        const hex = color.hex();
        
        if (hex.toLowerCase() !== lastHex.current?.toLowerCase()) {
          lastHex.current = hex;
          
          const lowerHex = hex.toLowerCase();
          recentEmissions.current.add(lowerHex);
          setTimeout(() => {
            recentEmissions.current.delete(lowerHex);
          }, 800);

          onChange(hex);
        }
      } catch (e) {
        console.error('Error in ColorPicker change handler:', e);
      }
    }
  }, [hue, saturation, brightness, onChange]);

  return (
    <ColorPickerContext.Provider
      value={{
        hue,
        saturation,
        brightness,
        setHue,
        setSaturation,
        setBrightness,
      }}
    >
      <div className={cn('grid w-full gap-4', className)} {...props} />
    </ColorPickerContext.Provider>
  );
};

export type ColorPickerSelectionProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerSelection = ({
  className,
  ...props
}: ColorPickerSelectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const { hue, saturation, brightness, setSaturation, setBrightness } = useColorPicker();

  // Sync internal cursor position when HSV values change externally
  useEffect(() => {
    setPosition({
      x: saturation / 100,
      y: 1 - (brightness / 100)
    });
  }, [saturation, brightness]);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isDragging || !containerRef.current) {
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(
        0,
        Math.min(1, (event.clientX - rect.left) / rect.width)
      );
      const y = Math.max(
        0,
        Math.min(1, (event.clientY - rect.top) / rect.height)
      );

      setPosition({ x, y });
      setSaturation(x * 100);
      setBrightness((1 - y) * 100);
    },
    [isDragging, setSaturation, setBrightness]
  );

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      const stopDragging = () => setIsDragging(false);
      window.addEventListener('pointerup', stopDragging);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', stopDragging);
      };
    }
  }, [isDragging, handlePointerMove]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-[4/3] w-full cursor-crosshair rounded',
        className
      )}
      style={{
        background: `linear-gradient(0deg, rgb(0,0,0), transparent), linear-gradient(90deg, rgb(255,255,255), hsl(${hue}, 100%, 50%))`,
      }}
      onPointerDown={(e) => {
        e.preventDefault();
        setIsDragging(true);
        // Force immediate update on click
        const rect = containerRef.current!.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        setPosition({ x, y });
        setSaturation(x * 100);
        setBrightness((1 - y) * 100);
      }}
      {...props}
    >
      <div
        className="-translate-x-1/2 -translate-y-1/2 pointer-events-none absolute h-4 w-4 rounded-full border-2 border-white transition-all duration-150 ease-out"
        style={{
          left: `${position.x * 100}%`,
          top: `${position.y * 100}%`,
          boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
          backgroundColor: Color.hsv(hue, saturation, brightness).hex()
        }}
      />
    </div>
  );
};

export type ColorPickerHueProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerHue = ({
  className,
  ...props
}: ColorPickerHueProps) => {
  const { hue, setHue } = useColorPicker();

  return (
    <Root
      value={[hue]}
      max={360}
      step={1}
      className={cn('relative flex h-4 w-full touch-none items-center', className)}
      onValueChange={([hue]) => setHue(hue)}
      {...props}
    >
      <Track className="relative h-3 w-full grow rounded-full bg-[linear-gradient(90deg,#FF0000,#FFFF00,#00FF00,#00FFFF,#0000FF,#FF00FF,#FF0000)]">
        <Range className="absolute h-full" />
      </Track>
      <Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer" />
    </Root>
  );
};

export type ColorPickerEyeDropperProps = ComponentProps<typeof Button>;

export const ColorPickerEyeDropper = ({
  className,
  ...props
}: ColorPickerEyeDropperProps) => {
  const { setHue, setSaturation, setBrightness } = useColorPicker();

  const handleEyeDropper = async () => {
    try {
      // @ts-ignore - EyeDropper API is experimental
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      const color = Color(result.sRGBHex);

      setHue(color.hue() || 0);
      setSaturation(color.saturationv() || 100);
      setBrightness(color.value() || 100);
    } catch (error) {
      console.error('EyeDropper failed:', error);
    }
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleEyeDropper}
      className={cn('shrink-0 text-muted-foreground h-8 w-8', className)}
      {...props}
    >
      <PipetteIcon size={16} />
    </Button>
  );
};

export type ColorPickerFormatProps = HTMLAttributes<HTMLDivElement>;

export const ColorPickerFormat = ({
  className,
  ...props
}: ColorPickerFormatProps) => {
  const {
    hue,
    saturation,
    brightness,
    setHue,
    setSaturation,
    setBrightness,
  } = useColorPicker();
  
  const color = Color.hsv(hue, saturation, brightness);
  const hex = color.hex();

  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    try {
      const val = event.target.value;
      if (val.length >= 4) {
        const newColor = Color(val.startsWith('#') ? val : `#${val}`);
        setHue(newColor.hue() || 0);
        setSaturation(newColor.saturationv() || 100);
        setBrightness(newColor.value() || 100);
      }
    } catch (error) {
      // Silently catch incomplete hex codes during typing
    }
  };

  return (
    <div
      className={cn(
        '-space-x-px relative flex items-center shadow-sm w-full',
        className
      )}
      {...props}
    >
      <span className="-translate-y-1/2 absolute top-1/2 left-2 text-xs text-muted-foreground">
        #
      </span>
      <Input
        type="text"
        value={hex.replace('#', '')}
        onChange={handleChange}
        className="h-8 rounded bg-secondary pl-5 pr-2 text-xs shadow-none w-full"
      />
    </div>
  );
};
