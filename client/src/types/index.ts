// ─── Backward-compatible re-exports ──────────────────────────────────────────
// All existing imports from '../types' or '../../types' continue to work.
export type { IUser, IProduct, ICartItem, ICart, IPayment, IChatMessage } from '../domain';
export type {
    IStoreContext,
    IRoute,
    IAddToCartParams,
    IProductsTabProps,
    ICardBodyProps,
    IPaginationProps,
    IModalDetailProductProps,
    ISlideBarProps,
    IHomePageProps,
} from '../application/store/types';
