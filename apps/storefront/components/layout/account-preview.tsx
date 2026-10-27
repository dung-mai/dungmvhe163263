'use client';
// Layout adapted from the MIT-licensed official shadcn login-03 block.
// Authentication is intentionally not simulated.
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserRound } from 'lucide-react';
export function AccountPreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader className="items-center text-center">
          <div className="mb-3 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <UserRound />
          </div>
          <DialogTitle>Tài khoản Flashlab</DialogTitle>
          <DialogDescription>Chào mừng bạn đến với thế giới công nghệ.</DialogDescription>
        </DialogHeader>
        <Card className="border-0 shadow-none">
          <CardContent className="space-y-5 text-center text-sm text-muted-foreground">
            <p>
              Đăng nhập và quản lý đơn hàng sẽ được mở trong phiên bản tiếp theo. Bạn vẫn có thể
              khám phá sản phẩm và trải nghiệm giỏ hàng demo.
            </p>
            <Button className="w-full" onClick={onClose}>
              Tiếp tục khám phá
            </Button>
            <p className="text-xs">Không thu thập email hoặc mật khẩu trong bản demo.</p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
