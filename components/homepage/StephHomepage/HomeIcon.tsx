import Image from 'next/image';
import { HOME_ICON_SIZES } from './iconAssets';
import styles from './StephHomepage.module.css';

export default function HomeIcon({ name, className, pictogram, eager = false }: { name: string; className?: string; pictogram?: string; eager?: boolean }) {
  const size = HOME_ICON_SIZES[name];
  if (!size) throw new Error(`Unknown homepage icon: ${name}`);
  return <Image src={`/images/steph/vet-675/icons/${name}.svg`} width={size.width} height={size.height} alt="" className={`${styles.icon} ${className ?? ''}`} data-home-pictogram={pictogram} loading={eager ? 'eager' : 'lazy'} />;
}
