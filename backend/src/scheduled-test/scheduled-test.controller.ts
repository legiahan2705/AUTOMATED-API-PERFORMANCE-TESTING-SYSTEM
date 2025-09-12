import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateScheduledTestDto } from './dto/create-scheduled-test.dto';
import { UpdateScheduledTestDto } from './dto/update-scheduled-test.dto';
import { ScheduledTestsService } from './scheduled-test.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('scheduled-tests')
export class ScheduledTestsController {
  constructor(private readonly scheduledTestsService: ScheduledTestsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() dto: CreateScheduledTestDto,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const scheduleData = {
      ...dto,
      userId: req.user.userId,
    };

    return this.scheduledTestsService.create(scheduleData, file);
  }

  @Get()
  @UseGuards(JwtAuthGuard) //  Thêm auth guard
  findAll(@Req() req: any) {
    const userId = req.user.userId;
    return this.scheduledTestsService.findAll(userId); //  Truyền userId
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    return this.scheduledTestsService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  update(
    @Param('id') id: number,
    @Body() dto: UpdateScheduledTestDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.scheduledTestsService.update(id, dto, file);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.scheduledTestsService.remove(id);
  }
}
